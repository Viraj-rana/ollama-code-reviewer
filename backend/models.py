from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class ReviewStatus(str, Enum):
    APPROVE = "APPROVE"
    REQUEST_CHANGES = "REQUEST_CHANGES"
    PENDING = "PENDING"


class ReviewIssue(BaseModel):
    line: Optional[int] = None
    codeSnippet: str
    message: str
    severity: Severity
    ruleReference: Optional[str] = None
    suggestedFix: Optional[str] = None


class ReviewRating(BaseModel):
    style: int = Field(..., ge=0, le=10)
    errorPrevention: int = Field(..., ge=0, le=10)
    cleanCode: int = Field(..., ge=0, le=10)
    logic: int = Field(..., ge=0, le=10)
    overall: int = Field(..., ge=0, le=100)


class ReviewResult(BaseModel):
    summary: str
    status: ReviewStatus
    issues: List[ReviewIssue]
    markdownReport: str
    impactGraphMermaid: Optional[str] = ""
    rating: ReviewRating


class ProjectAnalysisResult(BaseModel):
    projectName: str
    description: str
    techStack: List[str]
    architecture: str
    keyFeatures: List[str]
    suggestedReadme: str
    impactGraphMermaid: Optional[str] = ""


class ReviewRequest(BaseModel):
    styleGuide: str
    codeDiff: str
    blockOnWarning: bool = True


class RepoAnalysisRequest(BaseModel):
    repoName: str
    fileTree: str
    keyFileContents: str


class TranslateReviewRequest(BaseModel):
    result: ReviewResult
    targetLang: str


class TranslateTextRequest(BaseModel):
    text: str
    targetLang: str = "Russian"


class GenerateFixRequest(BaseModel):
    styleGuide: str
    originalContext: str
    issue: ReviewIssue


class GenerateFixResponse(BaseModel):
    code: str


class ChunkReviewResult(BaseModel):
    """
    Internal-only structure for partial chunk analysis.
    """

    summary: str
    rating: ReviewRating
    issues: List[ReviewIssue]

