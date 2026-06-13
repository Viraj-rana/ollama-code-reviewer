//main llm code
import { ReviewResult, ProjectAnalysisResult, ReviewIssue } from "../types";

const API_BASE =
  (import.meta as any).env?.VITE_REVIEW_API_URL || "http://localhost:8000";

interface BackendError {
  detail?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Backend error (${res.status})`;
    try {
      const data = (await res.json()) as BackendError;
      if (data?.detail) {
        message = data.detail;
      }
    } catch {
      // ignore JSON parse errors and fall back to generic message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}


export const analyzeCode = async (
  styleGuide: string,
  codeDiff: string,
  blockOnWarning: boolean
): Promise<ReviewResult> => {
  return postJson<ReviewResult>("/review", {
    styleGuide,
    codeDiff,
    blockOnWarning,
  });
};

export const analyzeRepository = async (
  repoName: string,
  fileTree: string,
  keyFileContents: string
): Promise<ProjectAnalysisResult> => {
  return postJson<ProjectAnalysisResult>("/analyze-repo", {
    repoName,
    fileTree,
    keyFileContents,
  });
};

export const translateReviewResult = async (
  result: ReviewResult,
  targetLang: string
): Promise<ReviewResult> => {
  return postJson<ReviewResult>("/translate-review", {
    result,
    targetLang,
  });
};

export const generateFix = async (
  styleGuide: string,
  originalContext: string,
  issue: ReviewIssue
): Promise<string> => {
  const data = await postJson<{ code: string }>("/generate-fix", {
    styleGuide,
    originalContext,
    issue,
  });
  return data.code;
};

export const translateTextToRussian = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  const data = await postJson<{ text: string }>("/translate-text", {
    text,
    targetLang: "Russian",
  });
  return data.text;
};
