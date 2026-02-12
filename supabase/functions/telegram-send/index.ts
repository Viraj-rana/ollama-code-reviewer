
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno:any;

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("Server Error: TELEGRAM_BOT_TOKEN is not set in Supabase Secrets.");
    }

    const { chatId, text, parse_mode, reply_markup } = await req.json();

    if (!chatId || !text) {
      throw new Error("Missing 'chatId' or 'text' in request body.");
    }

    // Forward the request to Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parse_mode || 'HTML',
        reply_markup: reply_markup
      })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Telegram API Error: ${data.description}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
