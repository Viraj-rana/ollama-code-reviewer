import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';



// backend review API (Python + Ollama / qwen)
const REVIEW_API_URL = process.env.REVIEW_API_URL || 'http://localhost:8000/review';

// High-level style guide for CI reviews (can be overridden via env)
const DEFAULT_STYLE_GUIDE = (process.env.CI_STYLE_GUIDE || `
SEVERITY RULES:
- CRITICAL: Hardcoded credentials, fatal logic errors (crashes, infinite loops), or major security issues.
- WARNING: Significant correctness, performance, or design problems that are not fatal.
- INFO: Naming, documentation, minor refactors, and non-blocking improvements.

STATUS RULES:
- If ANY CRITICAL issue exists => status MUST be "REQUEST_CHANGES".
- If only WARNING or INFO issues exist => status SHOULD be "APPROVE".
- If no issues exist => status MUST be "APPROVE".
`).trim();

// Use provided credentials as default if env vars not present
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://innhtkqrvjqiuuetzxqh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlubmh0a3FydmpxaXV1ZXR6eHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDk5NzgsImV4cCI6MjA4NTI4NTk3OH0.Q_QHP2LYQjAk0c2u3fijuiYNKlw4kqrW1UqGBxUMfnA';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// GitHub Actions Context
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;

// GitLab CI Context
const GITLAB_CI = process.env.GITLAB_CI;
const CI_MERGE_REQUEST_TITLE = process.env.CI_MERGE_REQUEST_TITLE;
const CI_MERGE_REQUEST_IID = process.env.CI_MERGE_REQUEST_IID;
const GITLAB_USER_LOGIN = process.env.GITLAB_USER_LOGIN;
const CI_PROJECT_NAME = process.env.CI_PROJECT_NAME;
const CI_PROJECT_ID = process.env.CI_PROJECT_ID; // Numeric ID is safer for callback_data limits

// Helper to escape HTML characters for Telegram
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

async function run() {
  console.log(" Starting WinSolution AI Automated Review...");

  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Missing Supabase Credentials"); process.exit(1); }
  if (!REVIEW_API_URL) { console.error("❌ Missing REVIEW_API_URL"); process.exit(1); }

  // 1. Get PR/MR Data
  let prData = { title: "Manual Test", user: { login: "tester" }, number: 0, head: { repo: { name: "test-repo" } } };
  let prUrl = "";
  let repoUrl = "";
  let platform = "unknown";
  let projectId = ""; // Used for ChatOps

  if (GITHUB_EVENT_PATH) {
    platform = "github";
    try {
      const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8'));
      if (event.pull_request) {
        prData = event.pull_request;
        prUrl = event.pull_request.html_url || "";
        repoUrl = event.repository ? event.repository.html_url : "";
        projectId = event.repository ? event.repository.full_name : "";
        console.log(` Processing GitHub PR #${prData.number}: ${prData.title}`);
      }
    } catch (e) {
      console.error(" Could not read GitHub Event path, using mock data.");
    }
  } else if (GITLAB_CI) {
    platform = "gitlab";
    console.log(" Detected GitLab CI Environment");
    // Map GitLab variables to our internal data structure
    prData = {
        title: CI_MERGE_REQUEST_TITLE || "Untitled Merge Request",
        user: { login: GITLAB_USER_LOGIN || "gitlab_user" },
        number: CI_MERGE_REQUEST_IID || "0",
        head: { repo: { name: CI_PROJECT_NAME || "gitlab-repo" } }
    };
    // GitLab URL reconstruction
    prUrl = process.env.CI_MERGE_REQUEST_URL || "";
    repoUrl = process.env.CI_PROJECT_URL || "";
    // Prefer Numeric ID for Telegram callback limit (64 bytes), fallback to name
    projectId = CI_PROJECT_ID || CI_PROJECT_NAME; 
    console.log(` Processing GitLab MR #${prData.number}: ${prData.title}`);
  }

  // 2. Read Code Diff (In CI, we assume 'git diff' output is piped or fetched)
  let codeDiff = "";
  try {
    codeDiff = fs.readFileSync('pr_diff.txt', 'utf8');
  } catch (e) {
    console.log(" pr_diff.txt not found. Using dummy diff for testing.");
    codeDiff = `
    // DUMMY DIFF
    function insecure() {
      const key = "12345"; // Hardcoded credential
    }
    `;
  }

  if (codeDiff.length > 45000) {
    codeDiff = codeDiff.substring(0, 45000) + "\n...[Truncated]";
  }

  // 3. AI Analysis (via Python backend + Ollama / Qwen)
  console.log(" Analyzing with Qwen backend...");

  try {
    const response = await fetch(REVIEW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        styleGuide: DEFAULT_STYLE_GUIDE,
        codeDiff,
        blockOnWarning: true,
      }),
    });

    if (!response.ok) {
      let message = `Backend error (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.detail) {
          message = data.detail;
        }
      } catch {
        // ignore parse errors, use generic message
      }
      throw new Error(message);
    }

    const result = await response.json();
    
    console.log(`✅ Analysis Complete. Status: ${result.status}`);

    // 4. Send Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      console.log("📨 Sending Telegram Notification...");
      await sendTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, prData.user.login, prData.title, result, { 
          pr: prUrl, 
          repo: repoUrl,
          platform: platform,
          projectId: projectId,
          mrNumber: prData.number
      });
    } else {
      console.log("Telegram skipped (Missing credentials)");
    }

    // 5. Save to Supabase
    console.log(" Saving to Database...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const { error } = await supabase.from('reviews').insert({
      id: Date.now().toString(), // Simple ID
      timestamp: new Date().toISOString(),
      author: prData.user.login,
      project_name: prData.title,
      status: result.status,
      summary: result.summary,
      result_json: result,
      code_diff: codeDiff // Store the code diff in database
    });

    if (error) {
      console.error("❌ Supabase Error:", error);
      process.exit(1);
    } else {
      console.log("✅ Saved successfully to Supabase!");
    }

    // 6. CI Exit Logic
    if (result.status === 'REQUEST_CHANGES') {
        console.error("🚨 CRITICAL issues detected. Failing pipeline.");
        process.exit(1);
    } else {
        console.log("✨ Pipeline Passed (Only Warnings/Info or Clean).");
        process.exit(0);
    }

  } catch (error) {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
  }
}

// Helper: Robust Telegram Sender with ChatOps Support
async function sendTelegram(token, chatId, author, project, result, links = {}) {
  const emoji = result.status === 'APPROVE' ? '✅' : '❌';
  
  // CRITICAL: Escape HTML characters to prevent 400 Bad Request errors
  const safeProject = escapeHtml(project);
  const safeAuthor = escapeHtml(author);
  const safeSummary = escapeHtml(result.summary);
  
  let summary = `<b>${emoji} Review: ${safeProject}</b>\nAuthor: <code>${safeAuthor}</code>\nStatus: <b>${result.status}</b>\n\n<b>Summary:</b>\n${safeSummary}`;
  
  // Add Links
  if (links.pr || links.repo) {
      summary += `\n\n<b>🔗 Quick Links:</b>\n`;
      if (links.pr) summary += `<a href="${links.pr}">View Merge Request</a>\n`;
      if (links.repo) summary += `<a href="${links.repo}">Open Repository</a>`;
  }
  
  // ChatOps Buttons (Only for GitLab currently)
  let reply_markup = undefined;
  if (links.platform === 'gitlab' && links.projectId && links.mrNumber) {
       reply_markup = {
          inline_keyboard: [
              [
                  { text: "✅ Approve Merge", callback_data: `APPROVE|${links.projectId}|${links.mrNumber}` },
                  { text: "🚫 Decline & Close", callback_data: `DECLINE|${links.projectId}|${links.mrNumber}` }
              ]
          ]
      };
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
      chat_id: chatId,
      text: summary,
      parse_mode: 'HTML',
      reply_markup: reply_markup
  };

  try {
    const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.error(` Telegram API Error (${res.status}):`, text);
        // Retry logic for plain text if HTML fails (omitting buttons to be safe)
        if (text.includes("parse")) {
            console.log(" Retrying Telegram message as plain text...");
            delete body.parse_mode;
            delete body.reply_markup;
            await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body) 
            });
        }
    } else {
        console.log("✅ Telegram message sent.");
    }
  } catch (e) {
      console.error("❌ Network error sending Telegram:", e);
  }
}

run();

