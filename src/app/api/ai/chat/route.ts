import { google } from "@ai-sdk/google";
import { deepseek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase-server";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { createSipasTools } from "@/lib/ai/tools";

// OpenRouter client — uses OpenAI-compatible API
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "SIPAS AI Assistant",
  },
});

// Allow responses up to 60 seconds
export const maxDuration = 60;

async function runAI(model: any, systemPrompt: string, messages: any[], tools: any) {
  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5,
  } as any);

  console.log("=== AI CHAT RESULT ===");
  console.log("Text:", result.text);
  console.log(
    "Tool Results:",
    JSON.stringify(
      (result.toolResults || []).map((r: any) => ({ name: r.toolName, output: r.output }))
    )
  );
  console.log("Finish Reason:", result.finishReason);
  console.log("======================");

  let text = result.text;

  // Fallback if text is empty but a tool was executed successfully
  if (!text && result.toolResults && result.toolResults.length > 0) {
    const lastResult = result.toolResults[result.toolResults.length - 1] as any;
    if (lastResult.result && !lastResult.result.error) {
      text = `✅ Tindakan berhasil dilakukan! (Tool: ${lastResult.toolName})`;
    } else if (lastResult.result && lastResult.result.error) {
      text = `❌ Gagal memproses: ${lastResult.result.error}`;
    }
  }

  return text || null;
}

export async function POST(req: Request) {
  try {
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    const { messages, model: requestedModel = "gemini" } = await req.json();

    // Check for file attachment in last message
    const lastMessage = messages[messages.length - 1];
    let fileContext = "";
    if (
      lastMessage &&
      typeof lastMessage.content === "string" &&
      lastMessage.content.includes("Melampirkan file:")
    ) {
      const match = lastMessage.content.match(/\[.*\]\((.*)\)/);
      if (match && match[1]) {
        fileContext = `\n\n[FILE LAMPIRAN: User telah melampirkan file PDF dengan URL: ${match[1]}. Gunakan URL ini jika Anda membuat/mengedit surat.]`;
      }
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Silakan login terlebih dahulu." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: "User tidak ditemukan di database." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const aiTools = createSipasTools(dbUser.id, dbUser.role, supabase);
    const systemPrompt = buildSystemPrompt(dbUser) + fileContext;

    let text: string | null = null;
    let usedModel = requestedModel;

    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Helper: apakah error ini termasuk quota/rate-limit/billing?
    const isRecoverableError = (msg: string) =>
      msg.includes("quota") ||
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("rate") ||
      msg.includes("limit") ||
      msg.includes("Insufficient") ||
      msg.includes("balance") ||
      msg.includes("billing") ||
      msg.includes("402");

    // ── Try primary model ──────────────────────────────────────────────────────
    try {
      if (requestedModel === "deepseek") {
        if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi.");
        text = await runAI(deepseek("deepseek-chat"), systemPrompt, messages, aiTools);
      } else {
        // default: gemini
        if (!googleKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY belum dikonfigurasi.");
        text = await runAI(google("gemini-2.5-flash"), systemPrompt, messages, aiTools);
      }
    } catch (primaryError: any) {
      const primaryErrMsg: string = primaryError?.message || String(primaryError);
      console.warn(`[AI] Primary model (${usedModel}) failed: ${primaryErrMsg}`);

      // ── Fallback 1: Gemini gagal → coba DeepSeek ────────────────────────────
      if (requestedModel === "gemini" && isRecoverableError(primaryErrMsg) && deepseekKey) {
        console.log("[AI] Gemini failed — falling back to DeepSeek...");
        usedModel = "deepseek-fallback";
        try {
          text = await runAI(deepseek("deepseek-chat"), systemPrompt, messages, aiTools);
        } catch (deepseekErr: any) {
          const deepseekErrMsg: string = deepseekErr?.message || String(deepseekErr);
          console.warn(`[AI] DeepSeek fallback failed: ${deepseekErrMsg}`);

          // ── Fallback 2: DeepSeek gagal → coba OpenRouter ──────────────────
          if (openrouterKey) {
            console.log("[AI] DeepSeek failed — falling back to OpenRouter...");
            usedModel = "openrouter-fallback";
            try {
              text = await runAI(
                openrouter("openrouter/free"),
                systemPrompt,
                messages,
                aiTools
              );
            } catch (openrouterErr: any) {
              throw new Error(
                `Semua provider gagal. Gemini: ${primaryErrMsg} | DeepSeek: ${deepseekErrMsg} | OpenRouter: ${openrouterErr.message}`
              );
            }
          } else {
            throw new Error(
              `Gemini kena limit & DeepSeek juga gagal: ${deepseekErrMsg}`
            );
          }
        }
      } else {
        // ── Fallback langsung ke OpenRouter jika model lain gagal ────────────
        if (openrouterKey && isRecoverableError(primaryErrMsg)) {
          console.log(`[AI] ${requestedModel} failed — falling back to OpenRouter...`);
          usedModel = "openrouter-fallback";
          try {
            text = await runAI(
              openrouter("openrouter/free"),
              systemPrompt,
              messages,
              aiTools
            );
          } catch (openrouterErr: any) {
            throw new Error(
              `${requestedModel} gagal & OpenRouter juga gagal: ${openrouterErr.message}`
            );
          }
        } else {
          throw primaryError;
        }
      }
    }

    if (!text) {
      text = "Maaf, saya tidak dapat memproses permintaan ini. Silakan coba lagi.";
    }

    // Append note when auto-fallback is used
    if (usedModel === "deepseek-fallback") {
      text += "\n\n*⚡ Dialihkan ke DeepSeek (Gemini sedang kena limit)*";
    } else if (usedModel === "openrouter-fallback") {
      text += "\n\n*⚡ Dialihkan ke OpenRouter / Llama (provider utama tidak tersedia)*";
    }

    // Stream response back
    const encoder = new TextEncoder();
    const finalText = text;
    const stream = new ReadableStream({
      async start(controller) {
        const chunkSize = 100;
        for (let i = 0; i < finalText.length; i += chunkSize) {
          controller.enqueue(encoder.encode(finalText.slice(i, i + chunkSize)));
          await new Promise((r) => setTimeout(r, 20));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Model": usedModel,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("AI Chat API Error:", errMsg);

    if (
      errMsg.includes("API_KEY_INVALID") ||
      errMsg.includes("401") ||
      errMsg.includes("403") ||
      errMsg.includes("PERMISSION_DENIED")
    ) {
      return new Response(
        JSON.stringify({ error: "API Key tidak valid atau tidak memiliki akses." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Terjadi kesalahan server: ${errMsg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
