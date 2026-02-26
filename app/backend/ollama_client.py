#this file has no use right now maybe in future we can test the ollama models 
from __future__ import annotations
import json
import os
from typing import Any
import httpx
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "deepseek-r1:latest")
REQUEST_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
class OllamaError(RuntimeError):
    pass
async def _post_ollama_chat(payload: dict[str, Any]) -> str:
    """
    Low-level helper that sends a chat request to Ollama and returns the assistant content.
    """
    async with httpx.AsyncClient(base_url=OLLAMA_URL, timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post("/api/chat", json=payload)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise OllamaError(f"Ollama HTTP error: {exc.response.status_code} {exc.response.text}") from exc

        data = resp.json()
        # /api/chat returns { message: { role, content }, ... }
        message = data.get("message") or {}
        content = message.get("content")
        if not content:
            # Some older versions may return "response"
            content = data.get("response")

        if not content:
            raise OllamaError("Empty response content from Ollama.")

        return content
async def generate_text(system_prompt: str, user_prompt: str) -> str:
    """
    Call Ollama chat API with the given prompts and return the assistant text.
    """
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        # Deterministic-ish settings
        "options": {
            "temperature": 0.0,
        },
    }
    return await _post_ollama_chat(payload)
async def generate_json(
    system_prompt: str,
    user_prompt: str,
) -> str:
    """
    Convenience wrapper for prompts that must return ONLY JSON as plain text.
    """
    json_guard = (
        "IMPORTANT:\n"
        "- Return ONLY valid JSON.\n"
        "- Do NOT include backticks, markdown, or any commentary.\n"
        "- Ensure the JSON is syntactically correct and self-contained."
    )
    full_system = f"{system_prompt.strip()}\n\n{json_guard}"
    return await generate_text(full_system, user_prompt)
async def repair_json(raw_output: str, schema_description: str) -> str:
    """
    Ask the model to repair malformed JSON into valid JSON following a schema description.
    """
    system_prompt = (
        "You are a strict JSON formatter.\n"
        "You are given some potentially malformed model output and a description of the expected JSON schema.\n"
        "Your task is to return ONLY corrected JSON that strictly follows the schema.\n"
        "Do not add explanations or comments."
    )
    user_prompt = (
        f"Expected schema (for description, not for validation):\n{schema_description}\n\n"
        "Malformed model output (may contain extra text):\n"
        "-------------------\n"
        f"{raw_output}\n"
        "-------------------\n\n"
        "Extract and repair the JSON. Return only the JSON object or array."
    ) 
    return await generate_text(system_prompt, user_prompt)

