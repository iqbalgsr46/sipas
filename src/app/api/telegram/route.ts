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

// NVIDIA NIM API client
const nvidia = createOpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY ?? "",
});

// Escape markdown characters untuk Telegram
function escapeMarkdown(text: string): string {
  // Karakter yang perlu di-escape untuk MarkdownV2
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Kirim pesan ke Telegram dengan fallback
async function sendMessage(chatId: number, text: string, parseMode: "Markdown" | "HTML" | null = "Markdown") {
  console.log("[TG Bot] sendMessage called with chatId:", chatId);
  console.log("[TG Bot] TELEGRAM_API:", TELEGRAM_API);
  
  // Coba dengan parse mode yang diminta
  let response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  
  let result = await response.json();
  console.log("[TG Bot] Telegram API response:", JSON.stringify(result));
  
  // Jika gagal karena markdown error, coba kirim ulang tanpa formatting
  if (!result.ok && result.description?.includes("parse entities")) {
    console.warn("[TG Bot] Markdown parse error, retrying without formatting");
    
    response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text, // Kirim plain text
        disable_web_page_preview: true,
      }),
    });
    
    result = await response.json();
    console.log("[TG Bot] Retry response:", JSON.stringify(result));
  }
  
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
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  const isRecoverableError = (msg: string) =>
    msg.includes("quota") || msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate") ||
    msg.includes("limit") || msg.includes("Insufficient") ||
    msg.includes("balance") || msg.includes("billing") || msg.includes("402");

  const call = async (model: any, modelName: string) => {
    console.log(`[TG Bot] Calling ${modelName} model...`);
    
    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        tools,
        maxSteps: 5,
      } as any);

      // Log RAW result untuk debugging (safe stringify to avoid circular refs)
      console.log(`[TG Bot] ${modelName} RAW result object keys:`, Object.keys(result));
      
      try {
        const safeResult = {
          text: result.text,
          textLength: result.text?.length,
          toolCallsCount: result.toolCalls?.length,
          toolResultsCount: result.toolResults?.length,
          stepsCount: result.steps?.length
        };
        console.log(`[TG Bot] ${modelName} RAW result (safe):`, JSON.stringify(safeResult, null, 2));
      } catch (stringifyErr) {
        console.warn(`[TG Bot] Could not stringify result:`, stringifyErr);
      }

      console.log(`[TG Bot] ${modelName} result:`, JSON.stringify({
        text: result.text?.substring(0, 100) || "(empty)",
        textLength: result.text?.length || 0,
        toolCallsCount: result.toolCalls?.length || 0,
        toolResultsCount: result.toolResults?.length || 0,
        steps: result.steps?.length || 0
      }));

      // Log semua tool results untuk debugging
      if (result.toolResults && result.toolResults.length > 0) {
        console.log(`[TG Bot] Total tool results: ${result.toolResults.length}`);
        result.toolResults.forEach((tr: any, idx: number) => {
          try {
            const safeTr = {
              toolName: tr.toolName,
              toolCallId: tr.toolCallId,
              args: tr.args,
              hasResult: !!tr.result
            };
            console.log(`[TG Bot] Tool result ${idx} RAW:`, JSON.stringify(safeTr));
          } catch (err) {
            console.warn(`[TG Bot] Could not stringify tool result ${idx}`);
          }
          
          console.log(`[TG Bot] Tool result ${idx} details:`, {
            toolName: tr.toolName,
            hasResult: !!tr.result,
            resultIsNull: tr.result === null,
            resultIsUndefined: tr.result === undefined,
            resultType: typeof tr.result,
            hasError: !!tr.result?.error,
            args: tr.args,
            resultPreview: tr.result 
              ? (typeof tr.result === 'object' 
                ? JSON.stringify(tr.result).substring(0, 300)
                : String(tr.result).substring(0, 300))
              : "NO RESULT"
          });
        });
      } else {
        console.log(`[TG Bot] No tool results in response`);
      }

      // Prioritaskan text response dari AI
      if (result.text && result.text.trim()) {
        console.log(`[TG Bot] ${modelName} returned text response`);
        return result.text;
      }

      // Jika tidak ada text, cek apakah ada tool results
      console.log(`[TG Bot] ${modelName} no text response, checking tool results...`);
      console.log(`[TG Bot] Tool results exists:`, !!result.toolResults);
      console.log(`[TG Bot] Tool results length:`, result.toolResults?.length || 0);
      
      if (!result.toolResults || result.toolResults.length === 0) {
        console.warn(`[TG Bot] ${modelName} no text and no tool results`);
        return null;
      }

      // Ada tool results, format hasilnya
      console.log(`[TG Bot] ${modelName} executed ${result.toolResults.length} tools, formatting manually...`);
      const lastResult = result.toolResults[result.toolResults.length - 1] as any;
      
      console.log(`[TG Bot] Last tool details:`, {
        toolName: lastResult.toolName,
        hasResult: !!lastResult.result,
        resultType: typeof lastResult.result,
        resultIsNull: lastResult.result === null,
        resultKeys: lastResult.result && typeof lastResult.result === 'object' 
          ? Object.keys(lastResult.result) 
          : [],
        fullResult: lastResult.result 
          ? JSON.stringify(lastResult.result).substring(0, 500)
          : "UNDEFINED OR NULL"
      });
      
      // Cek apakah result undefined atau null
      if (!lastResult.result && lastResult.result !== 0 && lastResult.result !== false) {
        console.error(`[TG Bot] Tool ${lastResult.toolName} returned undefined/null result`);
        return `⚠️ Tool ${lastResult.toolName} tidak mengembalikan data. Kemungkinan ada masalah dengan query database atau permission.`;
      }
      
      // Cek error dari tool
      if (lastResult.result?.error) {
        console.log(`[TG Bot] Tool returned error:`, lastResult.result.error);
        return `❌ ${lastResult.result.error}`;
      }
      
      // Jika tool berhasil, format berdasarkan tool name
      if (lastResult.result) {
        const toolData = lastResult.result;
        console.log(`[TG Bot] Formatting result for tool: ${lastResult.toolName}`);
        
        // Format berdasarkan tool yang dipanggil
        if (lastResult.toolName === 'statistik_surat') {
          const stats = `📊 Statistik Surat\n\n` +
            `📥 Surat Masuk: ${toolData.surat_masuk?.total || 0}\n` +
            `📤 Surat Keluar: ${toolData.surat_keluar?.total || 0}\n` +
            `⏳ Menunggu Approval: ${toolData.surat_keluar?.menunggu_approval || 0}`;
          console.log(`[TG Bot] Generated stats response`);
          return stats;
        }
        
        if (lastResult.toolName === 'list_surat_masuk') {
          console.log(`[TG Bot] Formatting list_surat_masuk, data:`, JSON.stringify(toolData).substring(0, 200));
          if (Array.isArray(toolData) && toolData.length > 0) {
            let response = `📥 Surat Masuk (${toolData.length})\n\n`;
            toolData.slice(0, 5).forEach((surat: any, idx: number) => {
              response += `${idx + 1}. ${surat.nomor_surat}\n`;
              response += `   Pengirim: ${surat.pengirim}\n`;
              response += `   Perihal: ${surat.perihal}\n\n`;
            });
            return response;
          } else {
            return "📥 Tidak ada surat masuk ditemukan.";
          }
        }
        
        if (lastResult.toolName === 'list_surat_keluar') {
          if (Array.isArray(toolData) && toolData.length > 0) {
            let response = `📤 Surat Keluar (${toolData.length})\n\n`;
            toolData.slice(0, 5).forEach((surat: any, idx: number) => {
              response += `${idx + 1}. ${surat.nomor_surat}\n`;
              response += `   Tujuan: ${surat.tujuan}\n`;
              response += `   Perihal: ${surat.perihal}\n`;
              response += `   Status: ${surat.status}\n\n`;
            });
            return response;
          } else {
            return "📤 Tidak ada surat keluar ditemukan.";
          }
        }
        
        // Default fallback dengan preview data
        console.log(`[TG Bot] Using generic fallback for: ${lastResult.toolName}`);
        const preview = typeof toolData === 'object' 
          ? JSON.stringify(toolData, null, 2).substring(0, 300)
          : String(toolData).substring(0, 300);
        return `✅ Data berhasil diambil\n\nTool: ${lastResult.toolName}\n\nHasil:\n${preview}${preview.length >= 300 ? '...' : ''}`;
      }

      console.warn(`[TG Bot] ${modelName} tool result exists but empty`);
      return null;
      
    } catch (callError: any) {
      console.error(`[TG Bot] ${modelName} call error:`, callError?.message);
      console.error(`[TG Bot] ${modelName} error stack:`, callError?.stack);
      throw callError;
    }
  };

  // Coba Gemini dulu
  try {
    if (!googleKey) throw new Error("No Gemini key");
    const text = await call(google("gemini-2.5-flash"), "Gemini");
    if (text) return text;
  } catch (e: any) {
    const msg = e?.message || "";
    console.error("[TG Bot] Gemini failed:", msg);
    console.error("[TG Bot] Gemini error stack:", e?.stack);

    // Fallback 1 → DeepSeek
    if (isRecoverableError(msg) && deepseekKey) {
      try {
        const text = await call(deepseek("deepseek-chat"), "DeepSeek");
        if (text) return text + "\n\n_⚡ via DeepSeek_";
      } catch (e2: any) {
        console.error("[TG Bot] DeepSeek failed:", e2?.message);
        console.error("[TG Bot] DeepSeek error stack:", e2?.stack);

        // Fallback 2 → NVIDIA
        if (nvidiaKey) {
          try {
            const text = await call(nvidia("meta/llama-3.1-70b-instruct"), "NVIDIA");
            if (text) return text + "\n\n_⚡ via NVIDIA Llama_";
          } catch (e3: any) {
            console.error("[TG Bot] NVIDIA failed:", e3?.message);
            console.error("[TG Bot] NVIDIA error stack:", e3?.stack);

            // Fallback 3 → OpenRouter
            if (openrouterKey) {
              try {
                const text = await call(openrouter("openrouter/free"), "OpenRouter");
                if (text) return text + "\n\n_⚡ via OpenRouter_";
              } catch (e4: any) {
                console.error("[TG Bot] OpenRouter failed:", e4?.message);
                throw new Error(`Semua AI gagal: ${e4?.message}`);
              }
            } else {
              throw new Error(`Gemini, DeepSeek & NVIDIA gagal, OpenRouter key tidak ada`);
            }
          }
        } else if (openrouterKey) {
          try {
            const text = await call(openrouter("openrouter/free"), "OpenRouter");
            if (text) return text + "\n\n_⚡ via OpenRouter_";
          } catch (e3: any) {
            console.error("[TG Bot] OpenRouter failed:", e3?.message);
            throw new Error(`Semua AI gagal: ${e3?.message}`);
          }
        } else {
          throw new Error(`Gemini & DeepSeek gagal, NVIDIA & OpenRouter key tidak ada`);
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
    try {
      const tools = createSipasTools(sipasUser.id, sipasUser.role, supabase);
      const systemPrompt = buildSystemPrompt(sipasUser) +
        `\n\n## Konteks Platform\nKamu sedang membalas pesan melalui Telegram Bot. PENTING: Setelah memanggil tool, kamu HARUS memberikan respons text yang menjelaskan hasil tool tersebut kepada user. Jangan hanya memanggil tool tanpa memberikan penjelasan. Gunakan format yang ringkas dan jelas. Jangan gunakan markdown heading (##). Kamu bisa gunakan emoji untuk membuat respons lebih menarik.`;

      const aiResponse = await runAI(
        systemPrompt,
        [{ role: "user", content: text }],
        tools
      );

      await sendMessage(chatId, aiResponse);
    } catch (aiError: any) {
      console.error("[TG Bot] AI Error:", aiError?.message);
      console.error("[TG Bot] AI Error stack:", aiError?.stack);
      await sendMessage(
        chatId,
        `⚠️ Maaf, terjadi kesalahan saat memproses permintaan Anda.\n\nSilakan coba lagi atau hubungi admin jika masalah berlanjut.`,
        null // No parse mode untuk error message
      );
    }
    
    return new Response("ok");

  } catch (err: any) {
    console.error("[TG Bot] Error:", err?.message);
    return new Response("ok"); // Selalu return 200 ke Telegram
  }
}
