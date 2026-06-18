from __future__ import annotations

import os
import asyncio
from typing import Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)
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
from .telegram_bot import (
    process_telegram_update,
    start_telegram_polling,
    send_telegram_message,
    fetch_merge_request_diff,
    format_review_for_telegram,
    DEFAULT_STYLE_GUIDE,
)

#global variable to track the polling tasks
polling_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """lifespan context manager to start and stop the Telegram polling task."""
    global polling_task
    # start telegram polling in the background
    polling_task = asyncio.create_task(start_telegram_polling())
    yield
    # stop polling on shutdown
    if polling_task:
        polling_task.cancel()
        try:
            await polling_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="WinSolution AI Review Backend", version="1.0.0", lifespan=lifespan)

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

# --- Telegram Bot Endpoints ---

from pydantic import BaseModel

class TelegramWebhookRequest(BaseModel):
    """Model for Telegram webhook updates."""
    update_id: int
    message: dict | None = None
    edited_message: dict | None = None
    callback_query: dict | None = None


class TelegramReviewRequest(BaseModel):
    """Model for direct MR review request via API."""
    mr_url: str
    chat_id: str | None = None


@app.post("/telegram/webhook")
async def telegram_webhook(update: dict):
    """Handle Telegram webhook updates."""
    try:
        await process_telegram_update(update)
        return {"ok": True}
    except Exception as exc:
        print(f"Telegram webhook error: {exc}")
        return {"ok": False, "error": str(exc)}


@app.post("/telegram/review")
async def telegram_review(request: TelegramReviewRequest):
    """
    Trigger a code review for a merge request and optionally send to Telegram.
    """
    try:
        # Fetch the diff
        diff, error = await fetch_merge_request_diff(request.mr_url)
        
        if not diff:
            raise HTTPException(status_code=400, detail=error)
        
        # Perform code review
        review_request = ReviewRequest(
            styleGuide=DEFAULT_STYLE_GUIDE,
            codeDiff=diff,
            blockOnWarning=True
        )
        result = await analyze_code(review_request)
        
        # Send to Telegram if chat_id provided
        chat_id = request.chat_id or os.getenv("TELEGRAM_GROUP_ID")
        if chat_id:
            message = format_review_for_telegram(result, request.mr_url)
            await send_telegram_message(chat_id, message)
        
        return {
            "success": True,
            "result": result.model_dump(),
            "telegram_sent": bool(chat_id)
        }
    except HTTPException:
        raise
    except Exception as exc:
        msg = f"Telegram review failed: {exc}"
        raise HTTPException(status_code=500, detail=msg)
