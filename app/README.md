# WinSolution AI - Automated Code Review MVP

WinSolution AI is an intelligent "Automated Job" simulator that provides deep-dive architectural code reviews. Unlike standard linters, it uses advanced AI to analyze code against your custom engineering principles, verifying intent, logical consistency, and security risks.

![Dashbaord WinSolution Reviewer](/app/images/img.png)


WinSolution AI — это интеллектуальный симулятор «автоматизированных заданий», обеспечивающий углубленный анализ архитектуры кода. В отличие от стандартных линтеров, он использует передовые технологии искусственного интеллекта для анализа кода на соответствие вашим собственным инженерным принципам, проверяя намерения, логическую согласованность и риски безопасности.


**Important Usage Guideline**  
This application is **exclusively for WinSolution Engineering team members**. Unauthorized access or use by external parties is strictly prohibited.
Данное приложение предназначено **исключительно для членов инженерной команды WinSolution**. Несанкционированный доступ или использование третьими лицами строго запрещены.

![Sync Settings cloudbase](/images/img2.png.png)


##  How to Run Locally

### Prerequisites
- **Node.js**: Version 18.x or higher.
- **Python**: Version 3.10 or higher.
- **Ollama**: Installed locally with the `qwen2.5-coder:1.5b-base` model pulled.
- **Backend**: FastAPI service from the `backend/` directory running and reachable.

### Environment configuration
- **Frontend (Vite)**:
  - Set `VITE_REVIEW_API_URL` to your backend base URL (for example: `http://localhost:8000`).
- **CI / scripts**:
  - Set `REVIEW_API_URL` to `<backend-url>/review` (for example: `http://backend:8000/review` in CI).
- **Backend (Python)**:
  - Optional: `OLLAMA_URL` (default `http://localhost:11434`).
  - Optional: `MODEL_NAME` (default `qwen2.5-coder:1.5b-base`).

### Installation Steps
1. **Extract/Clone** the project files into a directory.
2. **Install Dependencies**:
   ```bash
   npm install
   npm run dev
   npm install lucide-react

   ### Gitlab or Github Integration

**how the flow executes**
  1. The Trigger GitLab CI

  When you push code to a Merge Request, GitLab will automatically detect the **.gitlab-ci.yml** file.
  Action: It spins up a node:20 container.
  Logic: It identifies that this is a merge_request_event.
  Diff Generation: It executes the specific git commands defined in the YAML file to fetch the target branch and compare it to your changes, saving the    output to pr_diff.txt.

  2. The Brain (The Script)

  The **scripts/ci-review.js** runs immediately after the diff is generated.
  Detection: It detects the GITLAB_CI environment variable.
  Metadata: It successfully grabs the author (GITLAB_USER_LOGIN), the title (CI_MERGE_REQUEST_TITLE), and the ID.
  Analysis: It reads the pr_diff.txt file and sends it to the Python backend, which calls the local Ollama model (`qwen2.5-coder:1.5b-base`) to perform the AI review.

  3. The Output (The Integration)

  Pass/Fail: If the review finds CRITICAL issues, the script exits with code 1, which tells GitLab to mark the pipeline as Failed, preventing the merge (if you have that setting enabled in GitLab).
  Reporting: It successfully pushes the data to Supabase (so your dashboard updates) and sends the Telegram alert.
  The Only "Manual" Step Remaining
  For this to work "100%", you must perform one configuration step in GitLab:


   ### Mathematical computation Algorithms
   **"Circuit Breaker" Algorithm**
    **Token Bucket (Rate Limiting)**
    **Data Binding**
    **Deep Searching**

##  Supabase Function Deployment (Backend) / optional only use for commerical

We use Supabase Edge Functions to handle Telegram interactions. The CLI is included in this project.

1. **Install CLI (if you haven't)**:
   ```bash
   npm install
   ```

2. **Login to Supabase**:
   ```bash
   npm run sb:login
   ```

3. **Link Project**:
   ```bash
   npm run sb:link
   ```
   *Enter your database password when prompted.*

4. **Deploy Function**:
   ```bash
   npm run sb:deploy
   ```
   *This uploads the `telegram-action` function to the cloud.*

5. **Register Webhook**:
   Copy the URL generated from the deploy step and set it as your Telegram Webhook (see documentation).

##  Core Dependencies
This application is built with a modern, performant tech stack:
- **React 19**: Frontend UI framework.
- **FastAPI** + **httpx**: Python backend that orchestrates reviews and talks to Ollama.
- **Ollama** + **Qwen2.5-Coder (1.5B, base)**: Local LLM used for code review, repo analysis, translations, and fix suggestions.
- **Tailwind CSS**: Utility-first styling with native Dark Mode support.
- **React Markdown**: Renders the AI's professional architectural reports.
- **Vite**: Ultra-fast build tool and dev server.

##  Concurrent Usage FAQ

### How many people can use this at once?
- **Infinite Users**: Because this is a client-side application, the UI can be served to thousands of users simultaneously via any static host (Vercel, Netlify, GitHub Pages).
- **The Bottleneck (API Rate Limits)**: 
  - If using the **Free Tier** API key: Google limits you to approximately 15 requests per minute. Multiple users hitting "Run Review" at once may trigger a "429 Rate Limit Exceeded" error.
  - If using a **Paid Tier** API key: The capacity increases significantly to thousands of requests per minute, easily supporting hundreds of concurrent users.

##  Architectural Features
- **Pipeline Runner Console**: Simulates a CI/CD job environment (GitLab/GitHub style) with real-time logging.
- **Intent Verification**: Analyzes GitLab MR/GitHub PR metadata to ensure the code changes actually match the developer's stated goal, every micro changes in merge request and review all bugs, injections every single detail.
- **Repo Analyst Mode**: Maps the "DNA" of an entire repository, identifying tech stacks and generating READMEs.
- **Custom Style Guides**: Allows engineers to enforce team-specific logic patterns that standard linters miss.

---
*Created by the WinSolution Engineering Team.*
