//this is the telegram action code
//it triggers the telegram actions notify
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
declare const Deno:any;

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const GITLAB_PAT = Deno.env.get("GITLAB_PAT");

serve(async (req: Request) => {
  try {
    const update = await req.json();

    // We only care about "callback_query" (Button Clicks)
    if (!update.callback_query) {
      return new Response("OK", { status: 200 });
    }

    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const data = callback.data; // Format: "ACTION|PROJECT_ID|MR_IID"
    const user = callback.from.username || callback.from.first_name;

    // 1. Parse Data
    const [action, projectId, mrIid] = data.split("|");

    if (!TELEGRAM_BOT_TOKEN || !GITLAB_PAT) {
      throw new Error("Missing Server-Side Secrets");
    }

    // 2. Execute GitLab Action
    let responseText = "";
    const headers = { "PRIVATE-TOKEN": GITLAB_PAT };
    const encodedProject = encodeURIComponent(projectId); // Handle groups like "owner/repo"

    if (action === "APPROVE") {
      const url = `https://gitlab.com/api/v4/projects/${encodedProject}/merge_requests/${mrIid}/approve`;
      const res = await fetch(url, { method: "POST", headers });
      
      if (res.ok) {
        responseText = `✅ <b>Approved</b> by @${user}`;
      } else {
        const err = await res.json();
        responseText = `⚠️ Approval Failed: ${err.message || res.statusText}`;
      }
    } 
    else if (action === "DECLINE") {
      // We close the MR
      const url = `https://gitlab.com/api/v4/projects/${encodedProject}/merge_requests/${mrIid}?state_event=close`;
      const res = await fetch(url, { method: "PUT", headers });

      if (res.ok) {
        responseText = `🚫 <b>Closed/Declined</b> by @${user}`;
      } else {
        const err = await res.json();
        responseText = ` Decline Failed: ${err.message || res.statusText}`;
      }
    }

    // 3. Update Telegram Message (Remove buttons, show result)
    // We append the result to the existing message text or just send a notification
    // Here we edit the original message to remove buttons and append status
    const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    
    // We keep the original HTML content but strip the buttons
    // Note: Telegram editMessageText requires sending the text again. 
    // For simplicity, we will append the status line to the original text if possible, 
    // or just replace the "Quick Links" footer. 
    
    // Strategy: We can't easily get the original full text without storing it. 
    // Simplest UX: Edit the message to say "Processed" and remove markup.
    
    const originalText = callback.message.text || callback.message.caption; // Plain text only available here
    const newText = originalText + `\n\n${responseText}`;

    await fetch(editUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        // We do NOT send reply_markup, which removes the buttons
      }),
    });

    // Answer callback to stop the loading animation on the button
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callback.id, text: "Action Processed" }),
    });

    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error(err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
