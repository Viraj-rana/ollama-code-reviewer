from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    GenerateFixRequest,
    GenerateFixResponse,
    RepoAnalysisRequest,
    ReviewRequest,
    TranslateReviewRequest,
    TranslateTextRequest,
)
from .review_service import (
    analyze_code,
    analyze_repository,
    generate_fix,
    translate_review_result,
    translate_text_to_language,
)


app = FastAPI(title="WinSolution AI Review Backend", version="1.0.0")

# Simple, permissive CORS by default so the SPA can talk to this service.
allowed_origins = os.getenv("REVIEW_API_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/review")
async def review(request: ReviewRequest):
    try:
        return await analyze_code(request)
    except Exception as exc:
        # Surface a concise error to the caller while logging details server-side.
        msg = f"Review analysis failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)


@app.post("/analyze-repo")
async def analyze_repo(request: RepoAnalysisRequest):
    try:
        return await analyze_repository(
            repo_name=request.repoName,
            file_tree=request.fileTree,
            key_file_contents=request.keyFileContents,
        )
    except Exception as exc:
        msg = f"Repository analysis failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)


@app.post("/translate-review")
async def translate_review(request: TranslateReviewRequest):
    try:
        translated = await translate_review_result(request.result, request.targetLang)
        return translated
    except Exception as exc:
        msg = f"Review translation failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)


@app.post("/translate-text")
async def translate_text(request: TranslateTextRequest) -> dict[str, Any]:
    try:
        translated = await translate_text_to_language(request.text, request.targetLang)
        return {"text": translated}
    except Exception as exc:
        msg = f"Text translation failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)


@app.post("/generate-fix")
async def generate_fix_endpoint(request: GenerateFixRequest) -> GenerateFixResponse:
    try:
        code = await generate_fix(
            style_guide=request.styleGuide,
            original_context=request.originalContext,
            issue_message=request.issue.message,
            code_snippet=request.issue.codeSnippet,
        )
        return GenerateFixResponse(code=code)
    except Exception as exc:
        msg = f"Fix generation failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )

