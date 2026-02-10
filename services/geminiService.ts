import { GoogleGenAI, Type } from "@google/genai";
import { ReviewResult, ReviewStatus, Severity, ProjectAnalysisResult, ReviewIssue } from "../types";

// --- Rate Limiter (Token Bucket Algorithm) ---
class TokenBucket {
  private capacity: number;
  private tokens: number;
  private lastRefill: number;
  private refillRateMs: number;

  constructor(capacity: number, tokensPerMinute: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRateMs = (60 * 1000) / tokensPerMinute;
  }

  async acquireToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    const waitTime = this.refillRateMs - timeSinceLastRefill;

    if (waitTime > 0) {
      // Wait for the next token to regenerate
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquireToken();
    } else {
      return this.acquireToken();
    }
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRateMs);

    if (newTokens > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}

// Initialize: 15 tokens per minute (Free Tier Limit), Max Burst 15
const rateLimiter = new TokenBucket(15, 15);

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview"; 

// --- SMART CHUNKING CONFIGURATION ---
// We target ~25k chars per chunk to fit comfortably within network payloads and ensure high-quality attention.
const CHUNK_SIZE = 25000; 

// --- PROMPT ENGINEERING: REFERENCE EXAMPLES ---
const REFERENCE_EXAMPLES = `
**REFERENCE EXAMPLES (Use this comprehensive style for the summary):**

**Example 1:**
*Input Change:* Removed hardcoded AWS_ACCESS_KEY from \`config.js\` and used \`process.env\`.
*Ideal Summary:* **Security Hardening & Configuration Management**: This change critically mitigates a potential data leak by removing hardcoded AWS credentials from \`config.js\`. The authentication logic has been refactored to utilize environment variables via \`process.env\`, ensuring strict separation of configuration from code and alignment with enterprise security standards.

**Example 2:**
*Input Change:* Added a new \`SortTable\` component and updated \`App.tsx\` to import it.
*Ideal Summary:* **Feature Implementation (UI)**: Introduction of a reusable \`SortTable\` component to enhance tabular data visualization. The main application entry point (\`App.tsx\`) has been updated to integrate this component, enabling interactive sorting capabilities for end-users and improving the overall dashboard UX.

**Example 3:**
*Input Change:* Changed variable \`x\` to \`userIndex\` in \`utils.ts\`.
*Ideal Summary:* **Maintainability & Refactoring**: Renamed the ambiguous variable \`x\` to \`userIndex\` within the \`utils.ts\` utility module. This semantic improvement significantly enhances code readability, reduces cognitive load for future maintainers, and clarifies the variable's specific role in the indexing logic.
`;

// Helper to split large diffs into logical chunks
const splitDiffIntoChunks = (diff: string): string[] => {
  if (diff.length <= CHUNK_SIZE) return [diff];

  const chunks: string[] = [];
  // Split by "diff --git" to attempt to preserve file boundaries
  // This Regex looks for "diff --git" without consuming it
  const files = diff.split(/(?=diff --git)/g); 
  
  let currentChunk = "";
  
  for (const file of files) {
    // If a single file diff is massive (> chunk size), we have to add it as its own chunk
    if (file.length > CHUNK_SIZE) {
        if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
        }
        chunks.push(file); 
    } else if (currentChunk.length + file.length > CHUNK_SIZE) {
        // Chunk is full, push it and start new
        chunks.push(currentChunk);
        currentChunk = file;
    } else {
        currentChunk += file;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks;
};

const handleApiError = (error: any) => {
  const msg = error.message || "";
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    throw new Error("Rate limit exceeded. Please wait 60 seconds and try again.");
  }
  if (msg.includes("Rpc failed") || msg.includes("xhr error") || msg.includes("error code: 6")) {
    throw new Error("Network Error: The code diff payload was too large for the web connection. Please check your internet or try a smaller diff.");
  }
  throw new Error(msg || "An unexpected error occurred during AI analysis.");
};

// --- ANALYSIS FUNCTIONS ---

// 1. Full Pass (Small Diffs)
// Used when the diff fits in a single chunk. Gives the most coherent result.
const analyzeSinglePass = async (
  styleGuide: string,
  diff: string
): Promise<ReviewResult> => {
  await rateLimiter.acquireToken();
  const ai = getAI();

  const systemInstruction = `
    You are a World-Class Senior Principal Engineer and Software Architect. 
    Analyze the provided code diff against the style guide.
    
    IMPORTANT: ANTI-HALLUCINATION & GROUNDING RULES
    1. TRUTH: You must ONLY reference code explicitly present in the provided diff. Do NOT hallucinate files, functions, or logic that are not visible.
    2. EVIDENCE: Every issue identified must be backed by a specific code snippet found in the diff.
    3. ACCURACY: If the code is clean and follows the style guide, explicit state "No issues found". Do not invent minor nitpicks to fill space.
    4. CONTEXT: Do not assume the existence of external libraries or files unless they are imported in the diff.

    TASK: Generate a comprehensive code review, a high-fidelity visual Impact Graph, and a SCALAR RATING.
    
    SCALAR RATING CRITERIA (1-10 Scale):
    Evaluate the code based on "Perplexity" and "Pattern Adherence". High surprise/deviation from standard patterns = Lower Score.
    - Style (1-10): Formatting, naming conventions, consistency.
    - ErrorPrevention (1-10): Bugs, potential runtime errors, type safety.
    - CleanCode (1-10): Readability, modularity, DRY, SOLID principles.
    - Logic (1-10): Algorithms, business logic correctness, edge case handling.
    - Overall (0-100): Weighted average (Logic 40%, Errors 30%, Clean 20%, Style 10%).

    SUMMARY REQUIREMENTS:
    - The summary MUST be comprehensive, detailed, and professional (approx. 3-5 sentences).
    - It should describe the high-level intent, specific key changes, and the architectural/business impact.
    - Avoid brief or vague one-liners.
    
    ${REFERENCE_EXAMPLES}

    CRITICAL STATUS RULES:
    1. If ANY issue is detected with severity 'CRITICAL', the status MUST be 'REQUEST_CHANGES'.
    2. If issues are only 'WARNING' or 'INFO', the status MUST be 'APPROVE'.
    3. If no issues are found, the status MUST be 'APPROVE'.
    
    IMPACT GRAPH REQUIREMENTS (Mermaid 'graph TD'):
    1. FORMAT: Strictly use 'graph TD' as the first line.
    2. HIERARCHY: Map from 'System/Module' -> 'File' -> 'Impacted Function/Logic Block'.
    3. RIPPLE EFFECT: Use arrows to show how the changes propagate.
    4. VISUAL HIGHLIGHTING (Strictly use these classes):
       - direct: for nodes directly modified in the diff.
       - ripple: for nodes NOT modified but logically impacted.
       - context: for stable components that are dependencies.
       
    Define these classes at the start of your graph:
    classDef direct fill:#ef4444,stroke:#7f1d1d,stroke-width:2px,color:#fff;
    classDef ripple fill:#f97316,stroke:#7c2d12,stroke-width:2px,color:#fff;
    classDef context fill:#f1f5f9,stroke:#64748b,stroke-width:1px,color:#475569;
    
    Output strictly in JSON format.
  `;

  const prompt = `
    **Engineering Style Guide:** ${styleGuide}
    **Code Diff to Review:** ${diff}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0, // Zero temperature for maximum determinism
        seed: 42,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            status: { type: Type.STRING, enum: [ReviewStatus.APPROVE, ReviewStatus.REQUEST_CHANGES] },
            rating: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.NUMBER },
                errorPrevention: { type: Type.NUMBER },
                cleanCode: { type: Type.NUMBER },
                logic: { type: Type.NUMBER },
                overall: { type: Type.NUMBER }
              },
              required: ["style", "errorPrevention", "cleanCode", "logic", "overall"]
            },
            markdownReport: { type: Type.STRING },
            impactGraphMermaid: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  codeSnippet: { type: Type.STRING },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: [Severity.INFO, Severity.WARNING, Severity.CRITICAL] },
                  ruleReference: { type: Type.STRING },
                },
                required: ["codeSnippet", "message", "severity"]
              }
            }
          },
          required: ["summary", "status", "issues", "rating", "markdownReport", "impactGraphMermaid"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine.");
    return JSON.parse(text) as ReviewResult;
  } catch (error: any) {
    return handleApiError(error);
  }
};

// 2. Partial Chunk Analysis (Large Diffs - Map Phase)
// Analyzes a piece of the diff to find specific issues.
const analyzeChunk = async (styleGuide: string, chunk: string): Promise<ReviewResult> => {
  await rateLimiter.acquireToken();
  const ai = getAI();
  
  const systemInstruction = `
    You are a Senior Engineer. Analyze this PARTIAL code diff chunk.
    
    STRICT GROUNDING:
    - Only report issues visible in this specific chunk.
    - Do not speculate about code in other files.
    - If no issues are found, return an empty issues array.
    
    TASK: Identify ALL issues (CRITICAL, WARNING, INFO) and provide an ESTIMATED RATING for this chunk.
    
    ${REFERENCE_EXAMPLES}

    Output in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `**Style Guide:** ${styleGuide}\n**Partial Diff Chunk:** ${chunk}`,
        config: {
            systemInstruction,
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING }, // Local summary for this chunk
                    rating: {
                        type: Type.OBJECT,
                        properties: {
                          style: { type: Type.NUMBER },
                          errorPrevention: { type: Type.NUMBER },
                          cleanCode: { type: Type.NUMBER },
                          logic: { type: Type.NUMBER },
                          overall: { type: Type.NUMBER }
                        },
                        required: ["style", "errorPrevention", "cleanCode", "logic", "overall"]
                    },
                    issues: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                codeSnippet: { type: Type.STRING },
                                message: { type: Type.STRING },
                                severity: { type: Type.STRING, enum: [Severity.INFO, Severity.WARNING, Severity.CRITICAL] },
                                ruleReference: { type: Type.STRING },
                            },
                            required: ["codeSnippet", "message", "severity"]
                        }
                    }
                },
                required: ["summary", "issues", "rating"]
            }
        }
    });
    const text = response.text;
    if (!text) return { 
        summary: "", 
        status: ReviewStatus.APPROVE, 
        issues: [], 
        markdownReport: "", 
        impactGraphMermaid: "",
        rating: { style: 10, errorPrevention: 10, cleanCode: 10, logic: 10, overall: 100 }
    };
    
    const json = JSON.parse(text);
    return {
        ...json,
        status: ReviewStatus.APPROVE, // Placeholder, will be calculated in Merge phase
        markdownReport: "", // Placeholder
        impactGraphMermaid: "" // Placeholder
    };
  } catch (e) {
    return handleApiError(e);
  }
};

// 3. Merge Analysis (Large Diffs - Reduce Phase)
// Combines partial results into a final report.
const mergeReviews = async (partialResults: ReviewResult[]): Promise<ReviewResult> => {
  await rateLimiter.acquireToken();
  const ai = getAI();

  const allIssues = partialResults.flatMap(r => r.issues);
  const chunkSummaries = partialResults.map(r => r.summary).join("\n");
  
  // Calculate average rating from chunks
  const avgRating = partialResults.reduce((acc, curr) => {
    return {
      style: acc.style + (curr.rating?.style || 0),
      errorPrevention: acc.errorPrevention + (curr.rating?.errorPrevention || 0),
      cleanCode: acc.cleanCode + (curr.rating?.cleanCode || 0),
      logic: acc.logic + (curr.rating?.logic || 0),
      overall: acc.overall + (curr.rating?.overall || 0)
    };
  }, { style: 0, errorPrevention: 0, cleanCode: 0, logic: 0, overall: 0 });

  const count = partialResults.length || 1;
  const finalRating = {
    style: Math.round(avgRating.style / count),
    errorPrevention: Math.round(avgRating.errorPrevention / count),
    cleanCode: Math.round(avgRating.cleanCode / count),
    logic: Math.round(avgRating.logic / count),
    overall: Math.round(avgRating.overall / count)
  };
  
  // Calculate final status
  const finalStatus = allIssues.some(i => i.severity === Severity.CRITICAL) 
    ? ReviewStatus.REQUEST_CHANGES 
    : ReviewStatus.APPROVE;

  const systemInstruction = `
    You are the Lead Architect. Synthesize these partial code review results into one Final Report.
    
    STRICT ACCURACY RULES:
    - Only include issues provided in the input list. Do not invent new ones during synthesis.
    - Ensure the summary accurately reflects the provided issues.
    
    INPUT:
    1. A list of issues found across all files.
    2. Draft summaries from partial reviews.

    TASK:
    1. 'summary': Write a DETAILED, cohesive Executive Summary (3-5 sentences). Synthesize the partial summaries into a comprehensive narrative.
    2. 'markdownReport': Write a comprehensive Markdown report detailing the architecture changes and key issues.
    3. 'impactGraphMermaid': Generate a MERMAID 'graph TD' visualizing the modified components.
    
    ${REFERENCE_EXAMPLES}
  `;

  const prompt = `
    **All Issues Found:** ${JSON.stringify(allIssues.map(i => ({ msg: i.message, sev: i.severity })))}
    **Draft Summaries from Chunks:** ${chunkSummaries}
  `;

  try {
     const response = await ai.models.generateContent({
         model: MODEL_NAME,
         contents: prompt,
         config: {
             systemInstruction,
             temperature: 0,
             responseMimeType: "application/json",
             responseSchema: {
                 type: Type.OBJECT,
                 properties: {
                     summary: { type: Type.STRING },
                     markdownReport: { type: Type.STRING },
                     impactGraphMermaid: { type: Type.STRING }
                 },
                 required: ["summary", "markdownReport", "impactGraphMermaid"]
             }
         }
     });
     
     const text = response.text;
     const json = JSON.parse(text || "{}");
     
     return {
         summary: json.summary || "Review Completed",
         status: finalStatus,
         issues: allIssues, // Return ALL issues from all chunks
         markdownReport: json.markdownReport || "No report generated.",
         impactGraphMermaid: json.impactGraphMermaid || "",
         rating: finalRating
     };

  } catch (e) {
      return handleApiError(e);
  }
};

// --- MAIN EXPORTED FUNCTION ---

export const analyzeCode = async (
  styleGuide: string,
  codeDiff: string,
  blockOnWarning: boolean
): Promise<ReviewResult> => {
  // 1. Split Diff
  const chunks = splitDiffIntoChunks(codeDiff);
  
  // 2. Optimization: If only 1 chunk, use single-pass (Faster, Cheaper, Better Context)
  if (chunks.length === 1) {
    return await analyzeSinglePass(styleGuide, chunks[0]);
  }

  // 3. Multi-Pass Strategy (Smart Chunking)
  const partialResults: ReviewResult[] = [];
  
  // Execute sequentially to be kind to the rate limiter (and our TokenBucket)
  for (const chunk of chunks) {
    const res = await analyzeChunk(styleGuide, chunk);
    partialResults.push(res);
  }
  
  // 4. Merge Results
  return await mergeReviews(partialResults);
};

// --- OTHER UTILS ---

const truncatePayload = (text: string): string => {
  // For other functions like analyzeRepository, we keep a safety limit
  const MAX = 45000;
  if (text.length <= MAX) return text;
  return text.substring(0, MAX) + "\n\n...[Truncated]...";
};

export const translateReviewResult = async (result: ReviewResult, targetLang: string): Promise<ReviewResult> => {
  await rateLimiter.acquireToken();
  const ai = getAI();
  const systemInstruction = `You are a Technical Translator. Translate the provided JSON review result into ${targetLang}. 
  Maintain all technical terms, code snippets, and Mermaid syntax exactly as they are. 
  ONLY translate the 'summary', 'markdownReport', and the 'message' field in the 'issues' array.
  Return the result in the exact same JSON format.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: JSON.stringify(result),
      config: {
        systemInstruction,
        temperature: 0,
        responseMimeType: "application/json"
      }
    });
    const text = response.text;
    if (!text) return result;
    return JSON.parse(text) as ReviewResult;
  } catch (error) {
    console.error("Translation failed", error);
    return result;
  }
};

export const generateFix = async (
  styleGuide: string,
  originalContext: string,
  issue: ReviewIssue
): Promise<string> => {
  await rateLimiter.acquireToken();
  const ai = getAI();
  const systemInstruction = `
    You are a Senior Refactoring Specialist. 
    Provide a corrected version of the code snippet.
    ONLY return raw code. No markdown backticks.
  `;

  const prompt = `
    **Style Guide:** ${styleGuide}
    **Context (Truncated):** ${truncatePayload(originalContext)}
    **Issue:** ${issue.message}
    **Code:** ${issue.codeSnippet}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        temperature: 0 
      }
    });
    return response.text?.trim() || "Unable to generate fix.";
  } catch (error: any) {
    return handleApiError(error);
  }
};

export const analyzeRepository = async (
  repoName: string,
  fileTree: string,
  keyFileContents: string
): Promise<ProjectAnalysisResult> => {
  await rateLimiter.acquireToken();
  const ai = getAI();
  const safeTree = truncatePayload(fileTree);

  const systemInstruction = `
    You are a Technical Architect and Senior Lead Documentation Specialist.
    Analyze this repository and provide an exceptionally comprehensive, enterprise-grade technical report.
    
    1. 'suggestedReadme': Generate an industry-standard Markdown README.md. It MUST be highly detailed.
    2. 'architecture': A more technical, concise executive summary of the architectural strategy.
    3. 'impactGraphMermaid': Generate a high-fidelity 'graph TD' visualizing directory relationships and internal data flow.
       - STRICTLY START WITH 'graph TD'.
       - Use alphanumeric IDs for nodes (e.g. A, B) and put labels in brackets A["Label"].
       - Do NOT use spaces in node IDs.
    
    Output strictly in JSON format.
  `;
  const prompt = `Repo Name: ${repoName}\nFile Tree:\n${safeTree}\nKey File Context:\n${keyFileContents}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            description: { type: Type.STRING },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            architecture: { type: Type.STRING },
            keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedReadme: { type: Type.STRING },
            impactGraphMermaid: { type: Type.STRING }
          },
          required: ["projectName", "description", "techStack", "architecture", "keyFeatures", "suggestedReadme", "impactGraphMermaid"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine.");
    return JSON.parse(text) as ProjectAnalysisResult;
  } catch (error: any) {
    return handleApiError(error);
  }
};