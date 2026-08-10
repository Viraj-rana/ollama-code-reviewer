//exact
import { ReviewResult, Severity, ExternalMR } from "../types";
import { supabase } from "./supabaseClient";

export const sendReviewToTelegram = async (
  chatId: string,
  author: string,
  projectName: string,
  result: ReviewResult,
  mrContext?: ExternalMR | null
) => {
  if (!chatId) return;


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

  // extract russian summary 
  let russianSummary = result.summary;
  const splitMarker = "🇷🇺 **Резюме:**";
  if (result.summary.includes(splitMarker)) {
    russianSummary = result.summary.split(splitMarker)[1].trim();
  } else if (result.summary.includes("**Резюме:**")) {
     russianSummary = result.summary.split("**Резюме:**")[1]?.trim() || result.summary;
  }

  const safeProject = escapeHtml(projectName);
  const safeAuthor = escapeHtml(author);
  const safeSummary = escapeHtml(russianSummary);

  // --- 3. builder header ---
  let headerText = `<b>${emojiStatus} WinSolution Review: ${safeProject}</b>\n\n`;
  headerText += `<b>Author:</b> ${safeAuthor}\n`;
  headerText += `<b>Status:</b> ${result.status}\n`;
  headerText += `<b>Score:</b> ${result.rating?.overall || 'N/A'}/100\n\n`;
  
  // Russian Summary 
  headerText += `<b>Резюме:</b>\n<i>${safeSummary}</i>\n\n`;
  
  headerText += `<b>Metrics:</b>\n`;
  headerText += `🚨 Critical: ${criticals} | ⚠️ Warning: ${warnings} | ℹ️ Info: ${infos}\n\n`;
  
  headerText += `<b>Detailed Issues:</b>\n`;

  // --- 4. CHUNKING LOGIC (From Old File) ---
  const MAX_MSG_LENGTH = 4000; 
  const messages: string[] = [];
  let currentMessageBuffer = headerText;

  // --- 5. ISSUES LOOP ---
  if (result.issues.length === 0) {
    currentMessageBuffer += "<i>No issues found. Clean code!</i>\n";
  } else {
    for (let i = 0; i < result.issues.length; i++) {
        const issue = result.issues[i];
        
        const cleanMessage = escapeHtml(issue.message);
        const cleanRule = issue.ruleReference ? escapeHtml(issue.ruleReference) : '';
        // Truncate snippet to 300 chars to prevent massive messages
        const cleanCode = issue.codeSnippet 
            ? escapeHtml(issue.codeSnippet.length > 300 ? issue.codeSnippet.substring(0, 300) + '...' : issue.codeSnippet) 
            : '';
        
        const sevIcon = issue.severity === Severity.CRITICAL ? '🚨' : issue.severity === Severity.WARNING ? '⚠️' : 'ℹ️';

        let issueBlock = `\n${i + 1}. ${sevIcon} <b>[${issue.severity}]</b> ${cleanMessage}`;
        
        if (cleanCode) {
            issueBlock += `\n<pre><code class="language-typescript">${cleanCode}</code></pre>`;
        }
        
        if (cleanRule) {
            issueBlock += `\nRule: <i>${cleanRule}</i>`;
        }
        issueBlock += `\n`;

        // Check buffer size
        if (currentMessageBuffer.length + issueBlock.length > MAX_MSG_LENGTH) {
            messages.push(currentMessageBuffer);
            currentMessageBuffer = `<b>...Continued (Part ${messages.length + 1})</b>\n${issueBlock}`;
        } else {
            currentMessageBuffer += issueBlock;
        }
    }
  }

  if (mrContext) {
      let linksBlock = `\n\n<b>🔗 Quick Links / Ссылки:</b>\n`;
      if (mrContext.url) {
          linksBlock += `<a href="${mrContext.url}">View Merge Request #${mrContext.number}</a>\n`;
      }
      let repoUrl = '';
      if (mrContext.platform === 'github') {
          repoUrl = `https://github.com/${mrContext.repo}`;
      } else if (mrContext.platform === 'gitlab') {
           repoUrl = `https://gitlab.com/${mrContext.repo}`;
      }
      if (repoUrl) {
          linksBlock += `<a href="${repoUrl}">Open Repository</a>`;
      }

      if (currentMessageBuffer.length + linksBlock.length > MAX_MSG_LENGTH) {
           messages.push(currentMessageBuffer);
           currentMessageBuffer = linksBlock;
      } else {
           currentMessageBuffer += linksBlock;
      }
  }

  // Final push
  if (currentMessageBuffer.length > 0) {
      messages.push(currentMessageBuffer);
  }

  // --- 7. BUTTONS (Only for last message) ---
  let reply_markup = undefined;
  if (mrContext && mrContext.platform === 'gitlab') {
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

  // --- 8. SEND VIA SUPABASE ---
  if (!supabase) {
    console.warn("Supabase client not initialized.");
    return;
  }

  try {
    // Send messages sequentially to ensure order
    for (let i = 0; i < messages.length; i++) {
         const isLast = i === messages.length - 1;
         
         const payload = {
             chatId: chatId,
             text: messages[i],
             parse_mode: 'HTML',
             // Only attach buttons to the very last message
             reply_markup: isLast ? reply_markup : undefined
         };

         const { error } = await supabase.functions.invoke('telegram-send', {
             body: payload
         });

         if (error) {
             console.error(`Failed to send Telegram chunk ${i+1}:`, error);
         } else {
             console.log(`Telegram chunk ${i+1}/${messages.length} sent.`);
         }
         
         // Small delay to ensure Telegram receives them in order
         if (!isLast) await new Promise(r => setTimeout(r, 300));
    }
  } catch (e) {
    console.error("Failed to invoke sending function", e);
  }
};
