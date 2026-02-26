from __future__ import annotations
import os
import re
import asyncio
import httpx
from typing import Optional, Tuple
from dotenv import load_dotenv
from .models import ReviewRequest, ReviewResult, Severity
from .review_service import analyze_code
from pathlib import Path

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_GROUP_ID = os.getenv("TELEGRAM_GROUP_ID")
TELEGRAM_API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
#pat
GITLAB_PAT = os.getenv("GITLAB_PAT")
GITHUB_PAT = os.getenv("GITHUB_PAT")
# Default style guide for code review
DEFAULT_STYLE_GUIDE = """
# Code Review Style Guide
## General Principles
1. Code should be clean, readable, and maintainable
2. Follow DRY (Don't Repeat Yourself) principles
3. Use meaningful variable and function names
4. Keep functions small and focused on a single task
5. Handle errors appropriately
6. Write secure code - no hardcoded credentials
## Best Practices
- Use type hints where applicable
- Document public APIs
- Follow consistent naming conventions
- Avoid deeply nested code
- Use constants for magic numbers
"""
async def send_telegram_message(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    """Send a message to a Telegram chat."""
    if not TELEGRAM_BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN not set")
        return False

    # Split long messages (Telegram limit is 4096 characters)
    MAX_LENGTH = 4000
    messages = []

    if len(text) <= MAX_LENGTH:
        messages = [text]
    else:
        # Split at newlines to preserve formatting
        lines = text.split("\n")
        current_msg = ""
        for line in lines:
            if len(current_msg) + len(line) + 1 > MAX_LENGTH:
                if current_msg:
                    messages.append(current_msg)
                current_msg = line
            else:
                current_msg = current_msg + "\n" + line if current_msg else line
        if current_msg:
            messages.append(current_msg)

    async with httpx.AsyncClient(timeout=30) as client:
        for msg in messages:
            try:
                resp = await client.post(
                    f"{TELEGRAM_API_BASE}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": msg,
                        "parse_mode": parse_mode
                    }
                )
                if resp.status_code != 200:
                    print(f"Telegram API error: {resp.status_code} - {resp.text}")
                    return False
                # Small delay between messages to ensure order
                if len(messages) > 1:
                    await asyncio.sleep(0.3)
            except Exception as e:
                print(f"Error sending Telegram message: {e}")
                return False
    return True
def parse_merge_request_url(url: str) -> Optional[Tuple[str, str, str, str]]:
    """
    Parse a merge request URL and return (platform, owner, repo, mr_number).
    Supports GitHub and GitLab URLs.
    """
    # GitHub PR: https://github.com/owner/repo/pull/123
    github_match = re.match(
        r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)",
        url
    )
    if github_match:
        return ("github", github_match.group(1), github_match.group(2), github_match.group(3))

    # GitLab MR: https://gitlab.com/owner/repo/-/merge_requests/123
    gitlab_match = re.match(
        r"https?://gitlab\.com/([^/]+)/([^/]+)/-/merge_requests/(\d+)",
        url
    )
    if gitlab_match:
        return ("gitlab", gitlab_match.group(1), gitlab_match.group(2), gitlab_match.group(3))

    # GitLab MR with subgroups: https://gitlab.com/group/subgroup/repo/-/merge_requests/123
    gitlab_subgroup_match = re.match(
        r"https?://gitlab\.com/(.+?)/-/merge_requests/(\d+)",
        url
    )
    if gitlab_subgroup_match:
        path = gitlab_subgroup_match.group(1)
        parts = path.rsplit("/", 1)
        if len(parts) == 2:
            return ("gitlab", parts[0], parts[1], gitlab_subgroup_match.group(2))

    return None
async def fetch_github_pr_diff(owner: str, repo: str, pr_number: str) -> Optional[str]:
    """Fetch the diff for a GitHub Pull Request."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"


    headers = {
        "Accept": "application/vnd.github.v3.diff",
        "User-Agent": "WinSolution-AI-Review-Bot"
    }
    
    # Add authorization header if GitHub PAT is available
    if GITHUB_PAT:
        headers["Authorization"] = f"Bearer {GITHUB_PAT}"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.text
            else:
                print(f"GitHub API error: {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            print(f"Error fetching GitHub PR: {e}")
            return None


async def fetch_gitlab_mr_diff(project_path: str, mr_number: str) -> Optional[str]:
    """Fetch the diff for a GitLab Merge Request."""
    import urllib.parse
    encoded_path = urllib.parse.quote(project_path, safe="")

    url = f"https://gitlab.com/api/v4/projects/{encoded_path}/merge_requests/{mr_number}/changes"

    headers = {"User-Agent": "WinSolution-AI-Review-Bot"}
    # Add authorization header if GitLab PAT is available
    if GITLAB_PAT:
        headers["PRIVATE-TOKEN"] = GITLAB_PAT

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                changes = data.get("changes", [])

                diff_parts = []
                for change in changes:
                    old_path = change.get("old_path", "")
                    new_path = change.get("new_path", "")
                    diff = change.get("diff", "")

                    diff_parts.append(f"diff --git a/{old_path} b/{new_path}")
                    diff_parts.append(diff)

                return "\n".join(diff_parts)
            else:
                print(f"GitLab API error: {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            print(f"Error fetching GitLab MR: {e}")
            return None
async def fetch_merge_request_diff(url: str) -> Tuple[Optional[str], str]:
    """
    Fetch the diff for a merge request URL.
    Returns (diff_content, error_message).
    """
    parsed = parse_merge_request_url(url)
    if not parsed:
        return None, "Could not parse merge request URL. Please use a valid GitHub PR or GitLab MR URL."

    platform, owner, repo, mr_number = parsed

    if platform == "github":
        diff = await fetch_github_pr_diff(owner, repo, mr_number)
        if diff:
            return diff, ""
        return None, f"Could not fetch GitHub PR #{mr_number} from {owner}/{repo}. Make sure the repository is public."

    elif platform == "gitlab":
        project_path = f"{owner}/{repo}"
        diff = await fetch_gitlab_mr_diff(project_path, mr_number)
        if diff:
            return diff, ""
        return None, f"Could not fetch GitLab MR !{mr_number} from {project_path}. Make sure the repository is public."

    return None, "Unsupported platform."
def format_review_for_telegram(result: ReviewResult, mr_url: str) -> str:
    """Format the review result as a Telegram message."""
    criticals = sum(1 for i in result.issues if i.severity == Severity.CRITICAL)
    warnings = sum(1 for i in result.issues if i.severity == Severity.WARNING)
    infos = sum(1 for i in result.issues if i.severity == Severity.INFO)

    status_emoji = "✅" if result.status.value == "APPROVE" else "❌"

    def escape_html(text: str) -> str:
        return (
            text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    message = f"<b>{status_emoji} WinSolution AI Code Review</b>\n\n"
    message += f"<b>MR:</b> <a href=\"{mr_url}\">View Merge Request</a>\n"
    message += f"<b>Status:</b> {result.status.value}\n"
    message += f"<b>Score:</b> {result.rating.overall}/100\n\n"

    message += f"<b>📊 Metrics:</b>\n"
    message += f"🚨 Critical: {criticals} | ⚠️ Warning: {warnings} | ℹ️ Info: {infos}\n\n"

    message += f"<b>📝 Summary:</b>\n<i>{escape_html(result.summary[:500])}</i>\n\n"

    if result.issues:
        message += "<b>🔍 Issues Found:</b>\n"
        for i, issue in enumerate(result.issues[:10], 1):  # Limit to first 10 issues
            sev_icon = "🚨" if issue.severity == Severity.CRITICAL else ("⚠️" if issue.severity == Severity.WARNING else "ℹ️")
            issue_msg = escape_html(issue.message[:200])
            message += f"\n{i}. {sev_icon} <b>[{issue.severity.value}]</b>\n{issue_msg}\n"

            if issue.codeSnippet:
                snippet = escape_html(issue.codeSnippet[:150])
                message += f"<pre><code>{snippet}</code></pre>\n"

        if len(result.issues) > 10:
            message += f"\n<i>... and {len(result.issues) - 10} more issues</i>\n"
    else:
        message += "<i> No issues found. Clean code!</i>\n"

    message += f"\n<b>📈 Ratings:</b>\n"
    message += f"Style: {result.rating.style}/10 | Error Prevention: {result.rating.errorPrevention}/10\n"
    message += f"Clean Code: {result.rating.cleanCode}/10 | Logic: {result.rating.logic}/10\n"

    return message


async def handle_review_command(chat_id: str, message_text: str) -> None:
    """Handle the /review command."""
    # Extract URL from command
    parts = message_text.strip().split(maxsplit=1)

    if len(parts) < 2:
        await send_telegram_message(
            chat_id,
            " <b>Usage:</b> /review &lt;merge_request_url&gt;\n\n"
            "Example:\n"
            "• GitHub: <code>/review https://github.com/owner/repo/pull/123</code>\n"
            "• GitLab: <code>/review https://gitlab.com/owner/repo/-/merge_requests/123</code>"
        )
        return

    mr_url = parts[1].strip()

    # Send processing message
    await send_telegram_message(
        chat_id,
        f"🔄 <b>Processing code review...</b>\n\n"
        f"<a href=\"{mr_url}\">Merge Request</a>\n\n"
        f"<i>This may take a minute. Please wait...</i>"
    )

    # Fetch the diff
    diff, error = await fetch_merge_request_diff(mr_url)

    if not diff:
        await send_telegram_message(
            chat_id,
            f" <b>Error:</b> {error}"
        )
        return

    # Perform code review
    try:
        request = ReviewRequest(
            styleGuide=DEFAULT_STYLE_GUIDE,
            codeDiff=diff,
            blockOnWarning=True
        )
        result = await analyze_code(request)

        # Format and send result
        message = format_review_for_telegram(result, mr_url)
        await send_telegram_message(chat_id, message)

    except Exception as e:
        await send_telegram_message(
            chat_id,
            f" <b>Review Failed:</b> {str(e)[:500]}"
        )

async def process_telegram_update(update: dict) -> None:
    """Process a Telegram update (message)."""
    message = update.get("message", {})
    text = message.get("text", "")
    chat = message.get("chat", {})
    chat_id = str(chat.get("id", ""))

    if not text or not chat_id:
        return
    if text.startswith("/review"):
        await handle_review_command(chat_id, text)
async def start_telegram_polling():
    """Start polling for Telegram updates."""
    if not TELEGRAM_BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN not set, skipping Telegram bot")
        return

    print(f"Starting Telegram bot polling... Token: {TELEGRAM_BOT_TOKEN[:20]}...")
    offset = 0

    while True:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
                resp = await client.get(
                    f"{TELEGRAM_API_BASE}/getUpdates",
                    params={
                        "offset": offset,
                        "timeout": 30
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get('ok'):
                        updates = data.get("result", [])
                        for update in updates:
                            offset = update["update_id"] + 1
                            print(f"Processing Telegram update: {update.get('update_id')}")
                            await process_telegram_update(update)
                else:
                    print(f"Telegram polling HTTP error: {resp.status_code} - {resp.text}")
                    await asyncio.sleep(5)

        except asyncio.CancelledError:
            print("Telegram polling stopped")
            break
        except httpx.TimeoutException:
            # Timeout is normal for long polling
            continue
        except Exception as e:
            print(f"Telegram polling error: {type(e).__name__}: {e}")
            await asyncio.sleep(5)
                