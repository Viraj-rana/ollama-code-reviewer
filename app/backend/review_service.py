from __future__ import annotations

import json
from typing import List, Type, TypeVar

from pydantic import BaseModel, ValidationError

from .models import (
    ChunkReviewResult,
    ProjectAnalysisResult,
    ReviewRating,
    ReviewRequest,
    ReviewResult,
    ReviewStatus,
    Severity,
)
from .gemini_client import generate_json, generate_text, repair_json


CHUNK_SIZE = 25_000
MAX_PAYLOAD = 45_000

T = TypeVar("T", bound=BaseModel)


def split_diff_into_chunks(diff: str, chunk_size: int = CHUNK_SIZE) -> List[str]:
    """
    Attempts to split a unified diff into chunks along file boundaries while
    keeping each chunk under the configured size.
    """
    if len(diff) <= chunk_size:
        return [diff]

    chunks: List[str] = []
    files = diff.split("diff --git")
    current = ""

    for idx, file_block in enumerate(files):
        if idx == 0 and not file_block.strip():
            # Leading empty segment before first "diff --git"
            continue
        block = ("diff --git" + file_block) if idx > 0 else file_block
        if len(block) > chunk_size:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(block)
        elif len(current) + len(block) > chunk_size:
            chunks.append(current)
            current = block
        else:
            current += block

    if current:
        chunks.append(current)

    return chunks


def _truncate(text: str, max_len: int = MAX_PAYLOAD) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len] + "\n\n...[Truncated]..."


async def _parse_with_repair(
    raw: str,
    model_cls: Type[T],
    schema_description: str,
) -> T:
    """
    Try to parse model output as JSON, and if that fails, call the repair
    helper to obtain valid JSON that matches the expected shape.
    """
    try:
        data = json.loads(raw)
        return model_cls.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        repaired_raw = await repair_json(raw, schema_description)
        data = json.loads(repaired_raw)
        return model_cls.model_validate(data)


async def analyze_single_pass(req: ReviewRequest) -> ReviewResult:
    """
    Analyze a reasonably sized diff in a single Ollama call.
    """
    style_guide = req.styleGuide
    diff = _truncate(req.codeDiff, MAX_PAYLOAD)

    system_prompt = """
You are a World-Class Senior Principal Engineer and Software Architect.
Analyze the provided code diff against the style guide.

IMPORTANT: ANTI-HALLUCINATION & GROUNDING RULES
1. TRUTH: Only reference code explicitly present in the provided diff. Do NOT hallucinate files, functions, or logic that are not visible.
2. EVIDENCE: Every issue identified must be backed by a specific code snippet found in the diff.
3. ACCURACY: If the code is clean and follows the style guide, explicitly state this. Do not invent minor nitpicks.
4. CONTEXT: Do not assume the existence of external libraries or files unless they are imported in the diff.

SEVERITY & STATUS RULES:
- Severity:
  - CRITICAL: Hardcoded credentials, fatal logic errors, or severe security / reliability issues.
  - WARNING: Important correctness, performance, or design issues that are not fatal.
  - INFO: Style, naming, documentation, or minor refactoring suggestions.
- Status:
  - If ANY issue is CRITICAL => status MUST be "REQUEST_CHANGES".
  - If issues are only WARNING or INFO => status MUST be "APPROVE".
  - If no issues => status MUST be "APPROVE".

OUTPUT JSON SCHEMA:
{
  "summary": string,
  "status": "APPROVE" | "REQUEST_CHANGES",
  "rating": {
    "style": number,           // 1-10
    "errorPrevention": number, // 1-10
    "cleanCode": number,       // 1-10
    "logic": number,           // 1-10
    "overall": number          // 0-100
  },
  "markdownReport": string,
  "impactGraphMermaid": string,
  "issues": [
    {
      "codeSnippet": string,
      "message": string,
      "severity": "INFO" | "WARNING" | "CRITICAL",
      "ruleReference": string | null
    },
    ...
  ]
}
""".strip()

    user_prompt = f"""Engineering Style Guide:
{style_guide}

Code Diff to Review:
{diff}
"""

    raw = await generate_json(system_prompt, user_prompt)
    schema_hint = "ReviewResult with fields summary, status, rating, markdownReport, impactGraphMermaid, issues[]."
    result = await _parse_with_repair(raw, ReviewResult, schema_hint)

    # Enforce status rule in case the model mislabels it.
    has_critical = any(issue.severity == Severity.CRITICAL for issue in result.issues)
    enforced_status = (
        ReviewStatus.REQUEST_CHANGES if has_critical else ReviewStatus.APPROVE
    )
    result.status = enforced_status
    return result


async def analyze_chunk(style_guide: str, chunk: str) -> ChunkReviewResult:
    """
    Analyze a partial diff chunk, returning local summary, rating, and issues.
    """
    system_prompt = """
You are a Senior Engineer. Analyze this PARTIAL code diff chunk.

STRICT GROUNDING:
- Only report issues visible in this specific chunk.
- Do not speculate about code in other files.
- If no issues are found, return an empty issues array.

TASK:
- Identify ALL issues (CRITICAL, WARNING, INFO) in this chunk.
- Provide a local summary and rating for this chunk only.

OUTPUT JSON SCHEMA:
{
  "summary": string,
  "rating": {
    "style": number,
    "errorPrevention": number,
    "cleanCode": number,
    "logic": number,
    "overall": number
  },
  "issues": [
    {
      "codeSnippet": string,
      "message": string,
      "severity": "INFO" | "WARNING" | "CRITICAL",
      "ruleReference": string | null
    },
    ...
  ]
}
""".strip()

    user_prompt = f"""Style Guide:
{style_guide}

Partial Diff Chunk:
{_truncate(chunk, MAX_PAYLOAD)}
"""
    raw = await generate_json(system_prompt, user_prompt)
    schema_hint = "ChunkReviewResult with fields summary, rating, issues[]."
    return await _parse_with_repair(raw, ChunkReviewResult, schema_hint)


async def merge_reviews(partials: List[ChunkReviewResult]) -> ReviewResult:
    """
    Merge partial chunk reviews into a single ReviewResult, using the model to
    synthesize a coherent summary/markdown/impactGraph while enforcing severity rules.
    """
    all_issues = [issue for part in partials for issue in part.issues]

    # Average ratings
    if partials:
        count = len(partials)
        sum_style = sum(p.rating.style for p in partials)
        sum_err = sum(p.rating.errorPrevention for p in partials)
        sum_clean = sum(p.rating.cleanCode for p in partials)
        sum_logic = sum(p.rating.logic for p in partials)
        sum_overall = sum(p.rating.overall for p in partials)
        final_rating = ReviewRating(
            style=round(sum_style / count),
            errorPrevention=round(sum_err / count),
            cleanCode=round(sum_clean / count),
            logic=round(sum_logic / count),
            overall=round(sum_overall / count),
        )
    else:
        final_rating = ReviewRating(
            style=10,
            errorPrevention=10,
            cleanCode=10,
            logic=10,
            overall=100,
        )

    has_critical = any(issue.severity == Severity.CRITICAL for issue in all_issues)
    final_status = (
        ReviewStatus.REQUEST_CHANGES if has_critical else ReviewStatus.APPROVE
    )

    system_prompt = """
You are the Lead Architect. Synthesize partial code review results into a single final report.

STRICT ACCURACY RULES:
- Only include issues that are provided in the input list; do not invent new ones.
- Ensure the summary accurately reflects the set of issues.

TASK:
1. "summary": Write a detailed executive summary (3-5 sentences) of the overall review.
2. "markdownReport": Write a comprehensive Markdown report, grouping issues and highlighting key risks and improvements.
3. "impactGraphMermaid": Generate a high-level Mermaid "graph TD" diagram that visualizes the impacted components.

OUTPUT JSON SCHEMA:
{
  "summary": string,
  "markdownReport": string,
  "impactGraphMermaid": string
}
""".strip()

    chunk_summaries = "\n".join(part.summary for part in partials)
    compact_issues = [
        {"message": i.message, "severity": i.severity.value} for i in all_issues
    ]
    user_prompt = f"""All Issues (message + severity only):
{json.dumps(compact_issues, ensure_ascii=False, indent=2)}

Draft Summaries from Chunks:
{chunk_summaries}
"""

    raw = await generate_json(system_prompt, user_prompt)

    class MergeSummary(BaseModel):
        summary: str
        markdownReport: str
        impactGraphMermaid: str

    schema_hint = "MergeSummary with fields summary, markdownReport, impactGraphMermaid."
    merge = await _parse_with_repair(raw, MergeSummary, schema_hint)

    return ReviewResult(
        summary=merge.summary or "Review Completed",
        status=final_status,
        issues=all_issues,
        markdownReport=merge.markdownReport or "No report generated.",
        impactGraphMermaid=merge.impactGraphMermaid or "",
        rating=final_rating,
    )


async def analyze_code(req: ReviewRequest) -> ReviewResult:
    """
    Main entry point used by the HTTP layer. Handles chunking and merge logic.
    """
    chunks = split_diff_into_chunks(req.codeDiff)
    if len(chunks) == 1:
        return await analyze_single_pass(req)

    partials: List[ChunkReviewResult] = []
    for chunk in chunks:
        partials.append(await analyze_chunk(req.styleGuide, chunk))
    return await merge_reviews(partials)


async def analyze_repository(
    repo_name: str,
    file_tree: str,
    key_file_contents: str,
) -> ProjectAnalysisResult:
    """
    High-level repository analysis (used by the Repo Analyst view).
    """
    system_prompt = """
You are a Technical Architect and Senior Lead Documentation Specialist.
Analyze this repository structure and provide an enterprise-grade technical report.

TASK:
1. "projectName": short project name.
2. "description": concise overview of what this project does.
3. "techStack": array of key technologies / languages.
4. "architecture": short but technical description of the architecture.
5. "keyFeatures": array of key product / technical features.
6. "suggestedReadme": detailed Markdown README content for the repo root.
7. "impactGraphMermaid": high-level Mermaid "graph TD" showing main directories and key data flows.

OUTPUT JSON SCHEMA:
{
  "projectName": string,
  "description": string,
  "techStack": string[],
  "architecture": string,
  "keyFeatures": string[],
  "suggestedReadme": string,
  "impactGraphMermaid": string
}
""".strip()

    safe_tree = _truncate(file_tree, MAX_PAYLOAD)
    safe_key = _truncate(key_file_contents, MAX_PAYLOAD)
    user_prompt = f"""Repository Name: {repo_name}

Repository File Tree (truncated if large):
{safe_tree}

Key Configuration / Context Files (truncated if large):
{safe_key}
"""
    raw = await generate_json(system_prompt, user_prompt)
    schema_hint = (
        "ProjectAnalysisResult with fields projectName, description, techStack, "
        "architecture, keyFeatures, suggestedReadme, impactGraphMermaid."
    )
    return await _parse_with_repair(raw, ProjectAnalysisResult, schema_hint)


async def translate_review_result(result: ReviewResult, target_lang: str) -> ReviewResult:
    """
    Translate summary, markdownReport, and issues[].message while preserving JSON structure.
    """
    system_prompt = f"""
You are a Technical Translator specializing in software development.
Translate the provided JSON review result into {target_lang}.

RULES:
- Keep all JSON keys, structure, and non-textual fields exactly the same.
- Do NOT change code snippets or Mermaid syntax.
- ONLY translate:
  - "summary"
  - "markdownReport"
  - each issue's "message"

Return ONLY the translated JSON.
""".strip()

    user_prompt = json.dumps(result.model_dump(mode="json"), ensure_ascii=False)
    raw = await generate_json(system_prompt, user_prompt)
    schema_hint = "ReviewResult schema for translation."
    return await _parse_with_repair(raw, ReviewResult, schema_hint)


async def translate_text_to_language(text: str, target_lang: str) -> str:
    """
    Simple text translation helper (used for Telegram summaries).
    """
    if not text.strip():
        return text

    system_prompt = f"""
You are a Technical Translator specializing in software development.
Translate the provided text to {target_lang}.

RULES:
- Preserve all code symbols, variable names, and technical terms where appropriate.
- Return ONLY the translated text, with no markdown backticks and no explanations.
""".strip()

    # For plain text we don't need JSON repair – just return the raw model output.
    return await generate_text(system_prompt, text)


async def generate_fix(
    style_guide: str,
    original_context: str,
    issue_message: str,
    code_snippet: str,
) -> str:
    """
    Generate a corrected version of a problematic code snippet.
    """
    system_prompt = """
You are a Senior Refactoring Specialist.
Given a style guide, a code context, and a problem description, produce a corrected
version of the provided code snippet.

RULES:
- Return ONLY raw code, with no markdown backticks and no commentary.
- Keep the language and framework consistent with the original code.
""".strip()

    user_prompt = f"""Style Guide:
{style_guide}

Context (may be truncated):
{_truncate(original_context, MAX_PAYLOAD)}

Issue Description:
{issue_message}

Original Code Snippet:
{code_snippet}
"""
    # For code we do not require JSON – just return the raw answer.
    fixed = await generate_text(system_prompt, user_prompt)
    return fixed.strip()

