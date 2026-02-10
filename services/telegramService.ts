
import { ReviewResult, Severity, ExternalMR } from "../types";
import { supabase } from "./supabaseClient";

export const sendReviewToTelegram = async (
  // botToken is removed from here!
  chatId: string,
  author: string,
  projectName: string,
  result: ReviewResult,
  mrContext?: ExternalMR | null
) => {
  if (!chatId) return;
  
  // 1. Construct the message (Client-side formatting is fine)
  const criticals = result.issues.filter(i => i.severity === Severity.CRITICAL).length;
  const warnings = result.issues.filter(i => i.severity === Severity.WARNING).length;
  const infos = result.issues.filter(i => i.severity === Severity.INFO).length;

  const emojiStatus = result.status === 'APPROVE' ? '✅' : '❌';
  
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const safeProject = escapeHtml(projectName);
  const safeAuthor = escapeHtml(author);
  const safeSummary = escapeHtml(result.summary);

  let message = `<b>${emojiStatus} WinSolution Review: ${safeProject}</b>\n`;
  message += `Author: <code>${safeAuthor}</code>\n`;
  message += `Status: <b>${result.status}</b>\n`;
  message += `Score: <b>${result.rating?.overall || 'N/A'}/100</b>\n\n`;
  
  message += `<b>Issues Found:</b>\n`;
  message += `🔴 Critical: ${criticals}\n`;
  message += `🟡 Warning: ${warnings}\n`;
  message += `🔵 Info: ${infos}\n\n`;

  message += `<b>Executive Summary:</b>\n${safeSummary}\n\n`;

  let reply_markup = undefined;

  // --- LINKS & BUTTONS SECTION ---
  if (mrContext) {
      message += `<b>🔗 Quick Links:</b>\n`;
      
      if (mrContext.url) {
          message += `<a href="${mrContext.url}">View Merge Request #${mrContext.number}</a>\n`;
      }
      
      let repoUrl = '';
      if (mrContext.platform === 'github') {
          repoUrl = `https://github.com/${mrContext.repo}`;
      } else if (mrContext.platform === 'gitlab') {
           repoUrl = `https://gitlab.com/${mrContext.repo}`;
      }

      if (repoUrl) {
          message += `<a href="${repoUrl}">Open Repository</a>`;
      }

      // Add Buttons for GitLab
      if (mrContext.platform === 'gitlab') {
          const projectIdentifier = mrContext.repo; 
          reply_markup = {
              inline_keyboard: [
                  [
                      { text: "✅ Approve Merge", callback_data: `APPROVE|${projectIdentifier}|${mrContext.number}` },
                      { text: "🚫 Decline & Close", callback_data: `DECLINE|${projectIdentifier}|${mrContext.number}` }
                  ]
              ]
          };
      }
  }

  // 2. SECURE SEND: Invoke Supabase Edge Function
  // We do NOT call https://api.telegram.org directly anymore.
  if (!supabase) {
    console.warn("Supabase client not initialized. Cannot send Telegram notification.");
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('telegram-send', {
      body: {
        chatId: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: reply_markup
      }
    });

    if (error) {
      console.error("Supabase Function Error:", error);
    } else {
      console.log("Notification Sent Securely via Edge Function");
    }

  } catch (e) {
    console.error("Failed to invoke sending function", e);
  }
};
