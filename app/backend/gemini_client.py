from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# load .env from the from directory
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = "gemini-1.5-flash"  # Use a valid stable model

# Configure the API
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class GeminiError(RuntimeError):
    pass

async def generate_text(system_prompt: str, user_prompt: str) -> str:
    """
    Call Gemini API with the given prompts and return the assistant text.
    """
    if not GOOGLE_API_KEY:
        raise GeminiError("GOOGLE_API_KEY environment variable is not set")
   
    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=system_prompt
        )
       
        # Use async version to avoid blocking
        response = await model.generate_content_async(user_prompt)
       
        if not response or not response.text:
            raise GeminiError("Empty response from Gemini API")
       
        return response.text
    except Exception as exc:
        raise GeminiError(f"Gemini API error: {str(exc)}") from exc

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
