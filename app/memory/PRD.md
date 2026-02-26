
Action: file_editor create /app/memory/PRD.md --file-text "# WinSolution AI Code Review Bot - PRD

## Project Overview
AI-powered code review application that reviews GitHub/GitLab merge requests via Telegram bot integration.

## Original Problem Statement
- Replace Ollama with Gemini-3-flash-preview LLM model
- Create Telegram bot integration for `/review <merge_request_link>` command
- Backend already separated in `/app/backend/` folder

## Tech Stack
- **Backend**: FastAPI (Python)
- **LLM**: Gemini 3 Flash Preview (via emergentintegrations library)
- **Telegram Bot**: Python httpx with polling
- **Frontend**: React + TypeScript + Vite

## Core Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Telegram Bot   │────▶│  FastAPI Backend │────▶│  Gemini 3 Flash │
│  (Polling)      │◀────│  :8000           │◀────│  AI Model       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  User's         │     │  GitHub/GitLab   │
│  Telegram       │     │  API (PR Diff)   │
└─────────────────┘     └──────────────────┘
```

## What's Been Implemented (Jan 2026)
1. ✅ Replaced Ollama with Gemini-3-flash-preview using emergentintegrations library
2. ✅ Created `/app/backend/gemini_client.py` - Gemini API client with text/JSON generation
3. ✅ Created `/app/backend/telegram_bot.py` - Telegram bot with:
   - Long polling for updates
   - `/review <url>` command handler
   - GitHub PR diff fetching
   - GitLab MR diff fetching
   - Review result formatting for Telegram
4. ✅ Updated `/app/backend/main.py` with:
   - Telegram webhook endpoint `/telegram/webhook`
   - Direct review endpoint `/telegram/review`
   - Background polling task on startup
5. ✅ Configured environment variables in `/app/backend/.env`

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/review` | POST | Code review (diff input) |
| `/analyze-repo` | POST | Repository analysis |
| `/translate-review` | POST | Translate review results |
| `/translate-text` | POST | Translate text |
| `/generate-fix` | POST | Generate code fix |
| `/telegram/webhook` | POST | Telegram webhook handler |
| `/telegram/review` | POST | Trigger review via API |

## User Flow
1. User sends `/review https://github.com/owner/repo/pull/123` to Telegram bot
2. Bot fetches PR diff from GitHub/GitLab API
3. Backend sends diff to Gemini 3 Flash for review
4. Review result formatted and sent back to Telegram

## Credentials Configured
- `GOOGLE_API_KEY` - Gemini API key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_GROUP_ID` - Target chat ID for reviews

## Next Action Items / Backlog
- P1: Add authentication for GitHub private repos (GitHub token)
- P1: Add GitLab token for private MR access
- P2: Store review history in database
- P2: Add custom style guide per user/project
- P3: Add inline comment suggestions on MR

## Future Enhancements
- CI/CD integration for automatic reviews
- Multiple language support for review summaries
- Dashboard for review analytics
"
Observation: Create successful: /app/memory/PRD.md