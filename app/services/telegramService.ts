import { ReviewResult, Severity, ExternalMR } from "../types";
import { supabase } from "./supabaseClient";

const MAX_MSG_LENGTH = 4000;

const REPO_HOSTS: Record<string, string> = {
  github: "https://github.com",
  gitlab: "https://gitlab.com",
};

const SEVERITY_ICON: Record<Severity, string> = {
  [Severity.CRITICAL]: "🚨",
  [Severity.WARNING]: "⚠️",
  [Severity.INFO]: "ℹ️",
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}...` : s);

const createChunker = (initial = "") => {
  const messages: string[] = [];
  let buffer = initial;

  const flush = () => {
    if (!buffer) return;
    messages.push(buffer);
    buffer = `<b>...Continued (Part ${messages.length + 1})</b>\n`;
  };

  return {
    append(chunk: string) {
      if (buffer.length + chunk.length > MAX_MSG_LENGTH) flush();
      buffer += chunk;
    },
    done() {
      if (buffer) messages.push(buffer);
      return messages;
    },
  };
};

export const sendReviewToTelegram = async (
  chatId: string,
  author: string,
  projectName: string,
  result: ReviewResult,
  mrContext?: ExternalMR | null
) => {
  if (!chatId) return;
  if (!supabase) {
    console.warn("Supabase client not initialized.");
    return;
  }

  const counts = result.issues.reduce<Partial<Record<Severity, number>>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});

  const [, ruPart] = result.summary.split(/\*\*Резюме:\*\*/);
  const russianSummary = (ruPart ?? result.summary).trim();

  const statusEmoji = result.status === "APPROVE" ? "✅" : "❌";

  const header = [
    `<b>${statusEmoji} WinSolution Review: ${escapeHtml(projectName)}</b>`,
    "",
    `<b>Author:</b> ${escapeHtml(author)}`,
    `<b>Status:</b> ${result.status}`,
    `<b>Score:</b> ${result.rating?.overall ?? "N/A"}/100`,
    "",
    "<b>Резюме:</b>",
    `<i>${escapeHtml(russianSummary)}</i>`,
    "",
    "<b>Metrics:</b>",
    `🚨 Critical: ${counts[Severity.CRITICAL] ?? 0} | ` +
      `⚠️ Warning: ${counts[Severity.WARNING] ?? 0} | ` +
      `ℹ️ Info: ${counts[Severity.INFO] ?? 0}`,
    "",
    "<b>Detailed Issues:</b>",
    "",
  ].join("\n");

  const chunker = createChunker(header);

  if (!result.issues.length) {
    chunker.append("<i>No issues found. Clean code!</i>\n");
  } else {
    result.issues.forEach((issue, i) => {
      const code = issue.codeSnippet
        ? `<pre><code class="language-typescript">${escapeHtml(truncate(issue.codeSnippet, 300))}</code></pre>\n`
        : "";
      const rule = issue.ruleReference
        ? `Rule: <i>${escapeHtml(issue.ruleReference)}</i>\n`
        : "";

      chunker.append(
        `\n${i + 1}. ${SEVERITY_ICON[issue.severity]} <b>[${issue.severity}]</b> ` +
          `${escapeHtml(issue.message)}\n${code}${rule}`
      );
    });
  }

  if (mrContext) {
    const host = REPO_HOSTS[mrContext.platform];
    const links = [
      "",
      "<b>🔗 Quick Links / Ссылки:</b>",
      mrContext.url
        ? `<a href="${mrContext.url}">View Merge Request #${mrContext.number}</a>`
        : "",
      host ? `<a href="${host}/${mrContext.repo}">Open Repository</a>` : "",
    ]
      .filter(Boolean)
      .join("\n");

    chunker.append(`\n${links}\n`);
  }

  const messages = chunker.done();

  const reply_markup =
    mrContext?.platform === "gitlab"
      ? {
          inline_keyboard: [
            [
              {
                text: "✅ Approve Merge",
                callback_data: `APPROVE|${mrContext.repo}|${mrContext.number}`,
              },
              {
                text: "🚫 Decline & Close",
                callback_data: `DECLINE|${mrContext.repo}|${mrContext.number}`,
              },
            ],
          ],
        }
      : undefined;

  try {
    for (const [i, text] of messages.entries()) {
      const isLast = i === messages.length - 1;

      const { error } = await supabase.functions.invoke("telegram-send", {
        body: {
          chatId,
          text,
          parse_mode: "HTML",
          reply_markup: isLast ? reply_markup : undefined,
        },
      });

      if (error) console.error(`Failed to send Telegram chunk ${i + 1}:`, error);
      else console.log(`Telegram chunk ${i + 1}/${messages.length} sent.`);

      if (!isLast) await new Promise((r) => setTimeout(r, 300));
    }
  } catch (e) {
    console.error("Failed to invoke sending function", e);
  }
};
