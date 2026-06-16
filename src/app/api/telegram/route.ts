import { google } from "@ai-sdk/google";
import { deepseek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase-server";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { createSipasTools } from "@/lib/ai/tools";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// OpenRouter fallback client
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "SIPAS Telegram Bot",
  },
});

// Kirim pesan ke Telegram
async function sendMessage(chatId: number, text: string, parseMode = "Markdown") {
  console.log("[TG Bot] sendMessage called with chatId:", chatId);
  console.log("[TG Bot] TELEGRAM_API:", TELEGRAM_API);
  
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  
  const result = await response.json();
  console.log("[TG Bot] Telegram API response:", JSON.stringify(result));
  
  if (!result.ok) {
    console.error("[TG Bot] Telegram API error:", result);
    throw new Error(`Telegram API error: ${result.description}`);
  }
  
  return result;
}

// Kirim "typing..." indicator
async function sendTyping(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// Jalankan AI dengan fallback
async function runAI(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  tools: any
): Promise<string> {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  const isRecoverableError = (msg: string) =>
    msg.includes("quota") || msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate") ||
    msg.includes("limit") || msg.includes("Insufficient") ||
    msg.includes("balance") || msg.includes("billing") || msg.includes("402");

  const call = async (model: any) => {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 5,
    } as any);

    let text = result.text;
    if (!text && result.toolResults?.length > 0) {
      const last = result.toolResults[result.toolResults.length - 1] as any;
      text = last.result?.error
        ? `❌ ${last.result.error}`
        : `✅ Tindakan berhasil! (${last.toolName})`;
    }
    return text || null;
  };

  // Coba Gemini dulu
  try {
    if (!googleKey) throw new Error("No Gemini key");
    const text = await call(google("gemini-2.5-flash"));
    if (text) return text;
  } catch (e: any) {
    const msg = e?.message || "";
    console.warn("[TG Bot] Gemini failed:", msg);

    // Fallback 1 → DeepSeek
    if (isRecoverableError(msg) && deepseekKey) {
      try {
        const text = await call(deepseek("deepseek-chat"));
        if (text) return text + "\n\n_⚡ via DeepSeek_";
      } catch (e2: any) {
        console.warn("[TG Bot] DeepSeek failed:", e2?.message);

        // Fallback 2 → OpenRouter
        if (openrouterKey) {
          try {
            const text = await call(openrouter("openrouter/free"));
            if (text) return text + "\n\n_⚡ via OpenRouter_";
          } catch (e3: any) {
            throw new Error(`Semua AI gagal: ${e3?.message}`);
          }
        }
      }
    } else {
      throw e;
    }
  }

  return "Maaf, saya tidak dapat memproses permintaan ini saat ini.";
}

export async function POST(req: Request) {
  try {
    console.log("[TG Bot] Received webhook request");
    
    // Debug: cek environment variables
    console.log("[TG Bot] BOT_TOKEN exists:", !!BOT_TOKEN);
    console.log("[TG Bot] BOT_TOKEN length:", BOT_TOKEN?.length || 0);
    
    const body = await req.json();
    console.log("[TG Bot] Request body:", JSON.stringify(body));
    
    const message = body?.message;
    if (!message) {
      console.log("[TG Bot] No message in body, returning ok");
      return new Response("ok");
    }

    const chatId: number = message.chat.id;
    const telegramUserId: number = message.from?.id;
    const text: string = message.text || "";
    
    console.log("[TG Bot] chatId:", chatId, "userId:", telegramUserId, "text:", text);

    // ── /start command ────────────────────────────────────────────────────────
    if (text.startsWith("/start")) {
      console.log("[TG Bot] Processing /start command");
      
      const responseText = `👋 *Halo! Selamat datang di SIPAS Bot.*\n\n` +
        `Bot ini terhubung ke *Sistem Informasi Persuratan Kabupaten Karawang*.\n\n` +
        `🔑 *Telegram ID kamu:* \`${telegramUserId}\`\n\n` +
        `Kirimkan ID di atas ke admin SIPAS untuk mendaftarkan akunmu.\n` +
        `Setelah terdaftar, kamu bisa langsung bertanya tentang surat, statistik, approval, dan lainnya.`;
      
      console.log("[TG Bot] Sending message to chatId:", chatId);
      
      try {
        await sendMessage(chatId, responseText);
        console.log("[TG Bot] Message sent successfully");
      } catch (sendErr: any) {
        console.error("[TG Bot] Failed to send message:", sendErr?.message);
        console.error("[TG Bot] Send error details:", sendErr);
      }
      
      return new Response("ok");
    }

    // ── Cek apakah user terdaftar di SIPAS ──────────────────────────────────
    const supabase = await createClient();
    const { data: sipasUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", String(telegramUserId))
      .single();

    if (userError || !sipasUser) {
      await sendMessage(
        chatId,
        `⛔ *Akses ditolak.*\n\n` +
        `Telegram ID kamu (\`${telegramUserId}\`) belum terdaftar di sistem SIPAS.\n\n` +
        `Hubungi admin untuk mendaftarkan ID tersebut.`
      );
      return new Response("ok");
    }

    // ── Kirim typing indicator ────────────────────────────────────────────────
    await sendTyping(chatId);

    // ── Jalankan AI ───────────────────────────────────────────────────────────
    const tools = createSipasTools(sipasUser.id, sipasUser.role, supabase);
    const systemPrompt = buildSystemPrompt(sipasUser) +
      `\n\n## Konteks Platform\nKamu sedang membalas pesan melalui *Telegram Bot*. Gunakan format Markdown yang kompatibel dengan Telegram (bold: *teks*, italic: _teks_, code: \`kode\`). Jangan gunakan heading markdown (##). Respons harus ringkas dan padat karena tampilan Telegram terbatas.`;

    const aiResponse = await runAI(
      systemPrompt,
      [{ role: "user", content: text }],
      tools
    );

    await sendMessage(chatId, aiResponse);
    return new Response("ok");

  } catch (err: any) {
    console.error("[TG Bot] Error:", err?.message);
    return new Response("ok"); // Selalu return 200 ke Telegram
  }
}
