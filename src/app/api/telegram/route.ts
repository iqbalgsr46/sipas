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

export const maxDuration = 60;

function getToolOutput(toolResult: any) {
  return toolResult?.output ?? toolResult?.result;
}

function normalizeIntent(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectStatsArgs(text: string) {
  const normalized = normalizeIntent(text);
  const isoDate = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const localDate = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);

  if (isoDate?.[1]) {
    return { periode: "custom", tanggal_mulai: isoDate[1], tanggal_selesai: isoDate[1] };
  }

  if (localDate) {
    const day = localDate[1].padStart(2, "0");
    const month = localDate[2].padStart(2, "0");
    const year = localDate[3];
    const date = `${year}-${month}-${day}`;
    return { periode: "custom", tanggal_mulai: date, tanggal_selesai: date };
  }

  if (hasAny(normalized, ["hari ini", "today"])) return { periode: "hari_ini" };
  if (hasAny(normalized, ["kemarin", "yesterday"])) return { periode: "kemarin" };
  if (hasAny(normalized, ["bulan ini", "month ini"])) return { periode: "bulan_ini" };
  if (hasAny(normalized, ["tahun ini", "year ini"])) return { periode: "tahun_ini" };

  return { periode: "semua" };
}

function extractSearchQuery(input: string) {
  const cleaned = input
    .replace(/^(tolong|mohon)?\s*(carikan|cari|temukan|tampilkan|lihat|ambil|dapatkan)\s*(saya)?/i, "")
    .replace(/\b(data asli|data|surat\s*(masuk|keluar)?|terbaru|hari ini|kemarin|bulan ini|tahun ini|di sistem|yang|berkaitan|dengan|mengenai|tentang|dari|untuk|saya|ada)\b/gi, " ")
    .replace(/\b(20\d{2}-\d{2}-\d{2})\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]20\d{2}\b/g, " ")
    .replace(/[.:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 3 && cleaned !== "..." ? cleaned : "";
}

function formatToolResults(toolResults: any[]) {
  const parts: string[] = [];

  for (const tr of toolResults) {
    const toolName = tr.toolName;
    const output = getToolOutput(tr);

    if (tr.type === "tool-error") {
      parts.push(`Gagal menjalankan ${toolName}: ${tr.error?.message ?? String(tr.error)}`);
      continue;
    }

    if (output === undefined || output === null) {
      parts.push(`Tool ${toolName} belum mengembalikan data. Silakan coba lagi.`);
      continue;
    }

    if (output.error) {
      parts.push(`Gagal (${toolName}): ${output.error}`);
      continue;
    }

    switch (toolName) {
      case "statistik_surat": {
        const periode = output.periode ? ` (${output.periode})` : "";
        parts.push([
          `Statistik Surat SIPAS${periode}`,
          "",
          `Surat masuk: ${output.surat_masuk?.total ?? 0} surat`,
          `Surat keluar: ${output.surat_keluar?.total ?? 0} surat`,
          `Menunggu approval: ${output.surat_keluar?.menunggu_approval ?? 0} surat`,
        ].join("\n"));
        break;
      }
      case "cari_surat_masuk":
      case "cari_surat_keluar": {
        const jenis = toolName === "cari_surat_masuk" ? "masuk" : "keluar";
        const data = Array.isArray(output) ? output : output.data ?? [];

        if (data.length === 0) {
          parts.push(`Tidak ada surat ${jenis} yang ditemukan.`);
          break;
        }

        const rows = data.slice(0, 5).map((surat: any, index: number) => {
          const pihak = toolName === "cari_surat_masuk"
            ? `Pengirim: ${surat.pengirim ?? "-"}`
            : `Tujuan: ${surat.tujuan ?? "-"}`;

          return [
            `${index + 1}. ${surat.nomor_surat ?? "-"}`,
            `   ${pihak}`,
            `   Perihal: ${surat.perihal ?? "-"}`,
            `   Status: ${surat.status ?? "-"}`,
          ].join("\n");
        });

        parts.push([`Ditemukan ${data.length} surat ${jenis}:`, "", ...rows].join("\n"));
        break;
      }
      case "daftar_pending_approval": {
        const data = output.data ?? [];

        if (data.length === 0) {
          parts.push("Tidak ada surat yang menunggu approval saat ini.");
          break;
        }

        const rows = data.slice(0, 10).map((surat: any, index: number) => (
          `${index + 1}. ${surat.nomor_surat ?? "-"} - ${surat.perihal ?? "-"}`
        ));
        parts.push([`${data.length} surat menunggu approval:`, "", ...rows].join("\n"));
        break;
      }
      case "detail_surat_masuk":
      case "detail_surat_keluar": {
        const surat = output.data;

        if (!surat) {
          parts.push("Surat tidak ditemukan.");
          break;
        }

        parts.push([
          `Detail ${toolName === "detail_surat_masuk" ? "Surat Masuk" : "Surat Keluar"}`,
          "",
          `Nomor: ${surat.nomor_surat ?? "-"}`,
          `${toolName === "detail_surat_masuk" ? "Pengirim" : "Tujuan"}: ${surat.pengirim ?? surat.tujuan ?? "-"}`,
          `Perihal: ${surat.perihal ?? "-"}`,
          `Tanggal: ${surat.tanggal_surat ?? "-"}`,
          `Status: ${surat.status ?? "-"}`,
        ].join("\n"));
        break;
      }
      case "buat_surat_masuk":
      case "buat_surat_keluar":
      case "kirim_approval":
      case "setujui_surat":
      case "tolak_surat":
      case "hapus_surat": {
        parts.push(output.message ?? "Aksi berhasil diproses.");
        break;
      }
      default: {
        const preview = typeof output === "object"
          ? JSON.stringify(output, null, 2).slice(0, 500)
          : String(output).slice(0, 500);
        parts.push(`Data berhasil diambil dari ${toolName}:\n${preview}`);
      }
    }
  }

  return parts.filter(Boolean).join("\n\n") || "Data berhasil diproses.";
}

async function runLocalTool(tools: any, toolName: string, args: Record<string, any> = {}) {
  const tool = tools?.[toolName];
  if (!tool?.execute) return `Tool ${toolName} tidak tersedia di server.`;

  const output = await tool.execute(args);
  return formatToolResults([{ toolName, output }]);
}

async function buildSearchResponse(tools: any, input: string) {
  const normalized = normalizeIntent(input);
  const query = extractSearchQuery(input);
  const listMode = hasAny(normalized, ["data asli", "terbaru", "daftar", "list", "tampilkan", "lihat", "ambil", "dapatkan"]);

  if (!query && !listMode) {
    return [
      "Bisa. Kirim kata kunci surat yang ingin dicari.",
      "",
      "Contoh: Cari surat masuk tentang undangan rapat",
    ].join("\n");
  }

  const wantsIncoming = normalized.includes("surat masuk");
  const wantsOutgoing = normalized.includes("surat keluar");
  const args = { query: query || undefined, limit: 5 };
  const results: string[] = [];

  if (!wantsOutgoing || wantsIncoming) {
    results.push(await runLocalTool(tools, "cari_surat_masuk", args));
  }

  if (!wantsIncoming || wantsOutgoing) {
    results.push(await runLocalTool(tools, "cari_surat_keluar", args));
  }

  return results.join("\n\n");
}

async function buildIncomingSummary(tools: any) {
  const result = await tools.cari_surat_masuk.execute({ limit: 5 });
  if (result?.error) return formatToolResults([{ toolName: "cari_surat_masuk", output: result }]);

  const data = result?.data ?? [];
  if (data.length === 0) return "Belum ada surat masuk yang bisa diringkas saat ini.";

  const rows = data.map((surat: any, index: number) => (
    `${index + 1}. ${surat.nomor_surat ?? "-"} - ${surat.perihal ?? "-"}\n   Pengirim: ${surat.pengirim ?? "-"}\n   Status: ${surat.status ?? "-"}`
  ));

  return ["Ringkasan surat masuk terbaru:", "", ...rows].join("\n");
}

async function tryLocalTelegramResponse(text: string, tools: any) {
  const normalized = normalizeIntent(text);
  if (!normalized || normalized.startsWith("/")) return null;

  if (hasAny(normalized, ["help", "bantuan", "menu"])) {
    return [
      "Saya bisa bantu akses data SIPAS langsung dari Telegram:",
      "- Statistik surat hari ini/bulan ini",
      "- Cari surat masuk atau surat keluar",
      "- Tampilkan surat terbaru",
      "- Ringkas surat masuk terbaru",
      "- Cek daftar approval",
      "",
      "Contoh: Berapa surat masuk hari ini?",
    ].join("\n");
  }

  if (hasAny(normalized, ["pending approval", "menunggu approval", "perlu disetujui", "antrian approval", "daftar approval"])) {
    return runLocalTool(tools, "daftar_pending_approval", { limit: 10 });
  }

  if (
    hasAny(normalized, ["statistik", "jumlah", "total", "berapa"]) &&
    hasAny(normalized, ["surat", "approval", "persetujuan"])
  ) {
    return runLocalTool(tools, "statistik_surat", detectStatsArgs(text));
  }

  if (hasAny(normalized, ["ringkas", "ringkasan", "resume"]) && normalized.includes("surat")) {
    return buildIncomingSummary(tools);
  }

  if (
    hasAny(normalized, ["cari", "carikan", "temukan", "tampilkan", "lihat", "ambil", "dapatkan", "data asli", "daftar", "list", "terbaru"]) &&
    normalized.includes("surat")
  ) {
    return buildSearchResponse(tools, text);
  }

  return null;
}

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
              input: tr.input ?? tr.args,
              hasOutput: getToolOutput(tr) !== undefined
            };
            console.log(`[TG Bot] Tool result ${idx} RAW:`, JSON.stringify(safeTr));
          } catch (err) {
            console.warn(`[TG Bot] Could not stringify tool result ${idx}`);
          }

          const toolOutput = getToolOutput(tr);
          
          console.log(`[TG Bot] Tool result ${idx} details:`, {
            toolName: tr.toolName,
            hasOutput: toolOutput !== undefined,
            outputIsNull: toolOutput === null,
            outputIsUndefined: toolOutput === undefined,
            outputType: typeof toolOutput,
            hasError: !!toolOutput?.error,
            input: tr.input ?? tr.args,
            outputPreview: toolOutput 
              ? (typeof toolOutput === 'object' 
                ? JSON.stringify(toolOutput).substring(0, 300)
                : String(toolOutput).substring(0, 300))
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
      const lastOutput = getToolOutput(lastResult);
      
      console.log(`[TG Bot] Last tool details:`, {
        toolName: lastResult.toolName,
        hasResult: lastOutput !== undefined,
        resultType: typeof lastOutput,
        resultIsNull: lastOutput === null,
        resultKeys: lastOutput && typeof lastOutput === 'object' 
          ? Object.keys(lastOutput) 
          : [],
        fullResult: lastOutput 
          ? JSON.stringify(lastOutput).substring(0, 500)
          : "UNDEFINED OR NULL"
      });
      
      // Cek apakah result undefined atau null
      if (lastOutput === undefined || lastOutput === null) {
        console.error(`[TG Bot] Tool ${lastResult.toolName} returned undefined/null result`);
        return `Tool ${lastResult.toolName} belum mengembalikan data. Silakan coba lagi.`;
      }
      
      // Cek error dari tool
      if (lastOutput?.error) {
        console.log(`[TG Bot] Tool returned error:`, lastOutput.error);
        return `Gagal: ${lastOutput.error}`;
      }
      
      // Jika tool berhasil, format berdasarkan tool name
      if (lastOutput) {
        const toolData = lastOutput;
        console.log(`[TG Bot] Formatting result for tool: ${lastResult.toolName}`);
        
        // Format berdasarkan tool yang dipanggil
        if (lastResult.toolName === 'statistik_surat') {
          const period = toolData.periode ? ` (${toolData.periode})` : "";
          const stats = `📊 Statistik Surat${period}\n\n` +
            `📥 Surat Masuk: ${toolData.surat_masuk?.total || 0}\n` +
            `📤 Surat Keluar: ${toolData.surat_keluar?.total || 0}\n` +
            `⏳ Menunggu Approval: ${toolData.surat_keluar?.menunggu_approval || 0}`;
          console.log(`[TG Bot] Generated stats response`);
          return stats;
        }
        
        if (lastResult.toolName === 'cari_surat_masuk') {
          const data = Array.isArray(toolData) ? toolData : toolData.data ?? [];
          console.log(`[TG Bot] Formatting cari_surat_masuk, data:`, JSON.stringify(data).substring(0, 200));
          if (data.length > 0) {
            let response = `📥 Surat Masuk (${data.length})\n\n`;
            data.slice(0, 5).forEach((surat: any, idx: number) => {
              response += `${idx + 1}. ${surat.nomor_surat}\n`;
              response += `   Pengirim: ${surat.pengirim}\n`;
              response += `   Perihal: ${surat.perihal}\n\n`;
            });
            return response;
          } else {
            return "📥 Tidak ada surat masuk ditemukan.";
          }
        }
        
        if (lastResult.toolName === 'cari_surat_keluar') {
          const data = Array.isArray(toolData) ? toolData : toolData.data ?? [];
          if (data.length > 0) {
            let response = `📤 Surat Keluar (${data.length})\n\n`;
            data.slice(0, 5).forEach((surat: any, idx: number) => {
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

  const providers = [
    {
      name: "NVIDIA",
      enabled: !!nvidiaKey,
      note: "",
      run: () => call(nvidia("meta/llama-3.1-70b-instruct"), "NVIDIA"),
    },
    {
      name: "Gemini",
      enabled: !!googleKey,
      note: "\n\n_via Gemini_",
      run: () => call(google("gemini-2.5-flash"), "Gemini"),
    },
    {
      name: "DeepSeek",
      enabled: !!deepseekKey,
      note: "\n\n_via DeepSeek_",
      run: () => call(deepseek("deepseek-chat"), "DeepSeek"),
    },
    {
      name: "OpenRouter",
      enabled: !!openrouterKey,
      note: "\n\n_via OpenRouter_",
      run: () => call(openrouter("meta-llama/llama-3.3-70b-instruct:free"), "OpenRouter"),
    },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.enabled) {
      errors.push(`${provider.name}: API key belum dikonfigurasi`);
      continue;
    }

    try {
      const text = await provider.run();
      if (text) return `${text}${provider.note}`;
    } catch (error: any) {
      const message = error?.message || String(error);
      errors.push(`${provider.name}: ${message}`);
      console.error(`[TG Bot] ${provider.name} failed:`, message);
      console.error(`[TG Bot] ${provider.name} error stack:`, error?.stack);
    }
  }

  console.warn("[TG Bot] All AI providers failed:", errors.join(" | "));
  return [
    "Maaf, provider AI cloud sedang tidak tersedia untuk chat bebas saat ini.",
    "",
    "Fitur data SIPAS tetap bisa dipakai. Coba: `Berapa surat masuk hari ini?`, `Cari surat masuk tentang rapat`, atau `Daftar approval`.",
  ].join("\n");
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
      
      // PRIORITAS 1: Coba jawab dengan local intent detection (CEPAT, TANPA AI)
      console.log("[TG Bot] Checking local intent first...");
      const localResponse = await tryLocalTelegramResponse(text, tools);
      
      if (localResponse) {
        console.log("[TG Bot] Local response found, sending directly");
        await sendMessage(chatId, localResponse);
        return new Response("ok");
      }
      
      // PRIORITAS 2: Jika tidak bisa dijawab lokal, gunakan AI model
      console.log("[TG Bot] No local match, calling AI provider...");
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
