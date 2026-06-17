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

// NVIDIA NIM API client
const nvidia = createOpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY ?? "",
});

// NVIDIA model used by the setup guide and test script.
const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";

// Allow responses up to 60 seconds
export const maxDuration = 60;

// ── Run AI with tools (standard providers) ────────────────────────────────────
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
  console.log("Tool Results:", JSON.stringify(
    (result.toolResults || []).map((r: any) => ({ name: r.toolName, output: r.result ?? r.output }))
  ));
  console.log("Finish Reason:", result.finishReason);
  console.log("======================");

  let text = result.text;

  // Jika AI hanya memanggil tool tanpa generate text, format tool results manual
  if ((!text || text.trim() === "") && result.toolResults && result.toolResults.length > 0) {
    text = formatToolResults(result.toolResults as any[]);
  }

  return text || null;
}

// NVIDIA is used for free-form text. SIPAS actions are handled locally first.
async function runNvidia(systemPrompt: string, messages: any[], _tools: any) {
  const step1 = await generateText({
    model: nvidia(NVIDIA_MODEL),
    system: systemPrompt,
    messages,
    maxSteps: 1,
  } as any);

  console.log("=== NVIDIA STEP 1 ===");
  console.log("Text:", step1.text);
  console.log("Tool Results:", JSON.stringify(
    (step1.toolResults || []).map((r: any) => ({ name: r.toolName, out: r.result ?? r.output }))
  ));
  console.log("Finish Reason:", step1.finishReason);
  console.log("====================");

  let text = step1.text;

  if ((!text || text.trim() === "") && step1.toolResults && step1.toolResults.length > 0) {
    text = formatToolResults(step1.toolResults as any[]);
  }

  return text || null;
}

// ── Format tool results menjadi teks yang informatif ─────────────────────────
function formatToolResults(toolResults: any[]): string {
  const parts: string[] = [];

  for (const tr of toolResults) {
    const toolName: string = tr.toolName;
    const output = tr.result ?? tr.output;
    if (!output) continue;

    if (output.error) {
      parts.push(`❌ Gagal (${toolName}): ${output.error}`);
      continue;
    }

    switch (toolName) {
      case "statistik_surat": {
        const sm = output.surat_masuk?.total ?? 0;
        const sk = output.surat_keluar?.total ?? 0;
        const pending = output.surat_keluar?.menunggu_approval ?? 0;
        parts.push(
          `📊 **Statistik Surat SIPAS**\n\n` +
          `| Kategori | Jumlah |\n|---|---|\n` +
          `| 📥 Surat Masuk | **${sm} surat** |\n` +
          `| 📤 Surat Keluar | **${sk} surat** |\n` +
          `| ⏳ Menunggu Approval | **${pending} surat** |\n\n` +
          `Ada yang ingin dilihat lebih detail?`
        );
        break;
      }
      case "cari_surat_masuk":
      case "cari_surat_keluar": {
        const jenis = toolName === "cari_surat_masuk" ? "Masuk" : "Keluar";
        const data: any[] = output.data ?? [];
        if (data.length === 0) {
          parts.push(`📭 Tidak ada surat ${jenis.toLowerCase()} yang ditemukan.`);
        } else {
          const rows = data
            .map((s: any, i: number) => `${i + 1}. **${s.nomor_surat}** — ${s.perihal} *(${s.status})*`)
            .join("\n");
          parts.push(`📋 **Ditemukan ${data.length} Surat ${jenis}:**\n\n${rows}\n\nIngin lihat detail salah satunya?`);
        }
        break;
      }
      case "daftar_pending_approval": {
        const data: any[] = output.data ?? [];
        if (data.length === 0) {
          parts.push(`✅ Tidak ada surat yang menunggu approval saat ini.`);
        } else {
          const rows = data
            .map((s: any, i: number) => `${i + 1}. **${s.nomor_surat}** — ${s.perihal}`)
            .join("\n");
          parts.push(`⏳ **${data.length} Surat Menunggu Approval:**\n\n${rows}\n\nIngin setujui atau tolak salah satunya?`);
        }
        break;
      }
      case "detail_surat_masuk":
      case "detail_surat_keluar": {
        const s = output.data;
        if (!s) {
          parts.push(`❌ Surat tidak ditemukan.`);
        } else {
          const jenis = toolName === "detail_surat_masuk" ? "Masuk" : "Keluar";
          parts.push(
            `📄 **Detail Surat ${jenis}**\n\n` +
            `| Field | Detail |\n|---|---|\n` +
            `| Nomor Surat | ${s.nomor_surat} |\n` +
            `| ${jenis === "Masuk" ? "Pengirim" : "Tujuan"} | ${s.pengirim ?? s.tujuan ?? "-"} |\n` +
            `| Perihal | ${s.perihal} |\n` +
            `| Tanggal | ${s.tanggal_surat} |\n` +
            `| Status | ${s.status} |` +
            (s.keterangan ? `\n| Keterangan | ${s.keterangan} |` : "")
          );
        }
        break;
      }
      case "buat_surat_masuk":
      case "buat_surat_keluar": {
        if (output.success) {
          const s = output.data;
          const jenis = toolName === "buat_surat_masuk" ? "masuk" : "keluar";
          parts.push(
            `✅ **Surat ${jenis} berhasil disimpan!**\n\n` +
            `- Nomor: **${s.nomor_surat}**\n` +
            `- Perihal: ${s.perihal}\n` +
            `- Status: ${s.status}` +
            (jenis === "keluar" ? `\n\nIngin mengajukan surat ini untuk approval?` : "")
          );
        }
        break;
      }
      case "setujui_surat":
      case "tolak_surat": {
        if (output.success) {
          const aksi = toolName === "setujui_surat" ? "disetujui ✅" : "ditolak ❌";
          parts.push(`Surat telah **${aksi}** dengan sukses.`);
        }
        break;
      }
      case "kirim_approval": {
        if (output.success) {
          parts.push(`✅ Surat berhasil diajukan untuk approval. Menunggu persetujuan pimpinan.`);
        }
        break;
      }
      case "hapus_surat": {
        if (output.success) {
          parts.push(`🗑️ Surat berhasil dihapus dari sistem.`);
        }
        break;
      }
      default: {
        if (output.success) {
          parts.push(`✅ Berhasil! (${toolName})`);
        } else {
          parts.push(`ℹ️ ${JSON.stringify(output)}`);
        }
      }
    }
  }

  return parts.join("\n\n");
}

function streamTextResponse(text: string, usedModel: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunkSize = 100;
      for (let i = 0; i < text.length; i += chunkSize) {
        controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
        await new Promise((r) => setTimeout(r, 15));
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
}

function getLastUserText(messages: any[]): string {
  if (!Array.isArray(messages)) return "";

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "user" && typeof message.content === "string") {
      return stripAttachmentMeta(message.content);
    }
  }

  return "";
}

function stripAttachmentMeta(text: string): string {
  return text.replace(/\n\n\*\(Melampirkan file:[\s\S]*?\)\*/g, "").trim();
}

function normalizeIntent(text: string): string {
  return stripAttachmentMeta(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function isPlaceholderPrompt(text: string): boolean {
  const normalized = normalizeIntent(text);
  return (
    normalized.includes("...") ||
    /\bkepada\s*\.*$/.test(normalized) ||
    /\btentang\s*\.*$/.test(normalized) ||
    /\bberkaitan dengan\s*\.*$/.test(normalized) ||
    /\bberikut\s*:?\s*$/.test(normalized)
  );
}

function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function runLocalTool(aiTools: any, toolName: string, args: Record<string, any> = {}) {
  const tool = aiTools?.[toolName];
  if (!tool?.execute) {
    return `Tool ${toolName} tidak tersedia di server.`;
  }

  const result = await tool.execute(args);
  return formatToolResults([{ toolName, result }]);
}

function extractSearchQuery(input: string): string {
  const cleaned = stripAttachmentMeta(input)
    .replace(/^(tolong|mohon)?\s*(carikan|cari|temukan|tampilkan)\s*(saya)?/i, "")
    .replace(/\bsurat\s*(masuk|keluar)?\b/gi, "")
    .replace(/\b(yang|berkaitan|dengan|mengenai|tentang|dari|di|sistem|ada|untuk|saya)\b/gi, " ")
    .replace(/[.:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3 || cleaned === "...") return "";
  return cleaned;
}

function cleanField(value: string | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\.\.\./g, "")
    .replace(/[.;]+$/g, "")
    .trim();
}

function extractTarget(input: string): string {
  const match = input.match(
    /(?:ditujukan kepada|kepada yth\.?|kepada|ke)\s+(.+?)(?:\s+(?:tentang|perihal|untuk|agar|dengan isi|berisi)\b|[.;\n]|$)/i
  );
  return cleanField(match?.[1]);
}

function extractSubject(input: string): string {
  const direct = input.match(/(?:tentang|perihal|keperluan)\s+(.+?)(?:[.;\n]|$)/i);
  const directValue = cleanField(direct?.[1]);
  if (directValue) return directValue;

  const lowered = input.toLowerCase();
  const knownSubjects = [
    "undangan rapat",
    "permohonan",
    "pemberitahuan",
    "surat tugas",
    "surat keputusan",
    "kerja sama",
    "koordinasi",
  ];

  return knownSubjects.find((subject) => lowered.includes(subject)) ?? "";
}

function parseKeyValue(input: string, key: string): string {
  const match = input.match(new RegExp(`${key}\\s*[=:]\\s*([^;\\n]+)`, "i"));
  return cleanField(match?.[1]);
}

function extractIdentifier(input: string): string {
  const uuid = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid?.[0]) return uuid[0];

  const id = input.match(/\bid\s*[=:]?\s*([0-9a-f-]{20,})/i);
  return cleanField(id?.[1]);
}

function buildLetterDetailRequest(): string {
  return [
    "Tentu, saya bisa bantu buatkan draf surat keluar.",
    "",
    "Agar drafnya rapi, mohon lengkapi data berikut:",
    "1. Tujuan surat: nama/jabatan/instansi penerima",
    "2. Perihal: topik utama surat",
    "3. Isi pokok: maksud surat, tanggal kegiatan bila ada, dan hal yang diminta/disampaikan",
    "4. Penandatangan: jabatan dan nama pejabat",
    "",
    "Contoh: `Buat surat keluar kepada Dinas Pendidikan tentang undangan rapat koordinasi pada 20 Juni 2026.`",
  ].join("\n");
}

function buildOutgoingLetterDraft(input: string, user: any): string {
  const target = extractTarget(input) || "[Tujuan Surat]";
  const subject = extractSubject(input) || "[Perihal Surat]";
  const today = formatLongDate();
  const signer = user?.full_name ? user.full_name : "[Nama Penandatangan]";

  return [
    "Berikut draf surat keluar yang bisa Anda tinjau:",
    "",
    "```text",
    "PEMERINTAH KABUPATEN KARAWANG",
    "[NAMA DINAS/INSTANSI]",
    "Jl. [Alamat Instansi] - Karawang",
    "",
    `Nomor     : DRAFT/${Date.now()}`,
    "Lampiran  : -",
    `Perihal   : ${subject}`,
    "",
    "Kepada Yth.",
    target,
    "di Tempat",
    "",
    "Dengan hormat,",
    "",
    `Sehubungan dengan ${subject.toLowerCase()}, kami menyampaikan surat ini sebagai pemberitahuan dan/atau permohonan resmi kepada pihak terkait.`,
    "",
    "Adapun rincian kegiatan atau kebutuhan yang perlu disampaikan adalah sebagai berikut:",
    "1. [Tuliskan latar belakang atau dasar surat]",
    "2. [Tuliskan maksud dan tujuan surat]",
    "3. [Tuliskan waktu, tempat, atau detail lain bila diperlukan]",
    "",
    "Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.",
    "",
    `Karawang, ${today}`,
    "[Jabatan Penandatangan]",
    "",
    "",
    signer,
    "NIP. [Nomor NIP]",
    "```",
    "",
    "Untuk menyimpan ke database sebagai draft, balas dengan format:",
    `\`Simpan draft: tujuan=${target}; perihal=${subject}\``,
  ].join("\n");
}

function buildSkDetailRequest(): string {
  return [
    "Saya bisa bantu susun draf Surat Keputusan (SK).",
    "",
    "Mohon lengkapi:",
    "1. Judul/tentang SK",
    "2. Dasar hukum atau alasan penerbitan",
    "3. Poin keputusan yang akan ditetapkan",
    "4. Nama/jabatan penandatangan",
    "",
    "Contoh: `Buatkan draf SK tentang pembentukan panitia kegiatan bulan bahasa.`",
  ].join("\n");
}

function buildSkDraft(input: string, user: any): string {
  const subject = extractSubject(input) || cleanField(input.replace(/buatkan?|draf|surat keputusan|sk|tentang/gi, "")) || "[Judul SK]";
  const today = formatLongDate();
  const signer = user?.full_name ? user.full_name : "[Nama Penandatangan]";

  return [
    "Berikut draf Surat Keputusan (SK) awal:",
    "",
    "```text",
    "PEMERINTAH KABUPATEN KARAWANG",
    "[NAMA DINAS/INSTANSI]",
    "",
    "KEPUTUSAN [JABATAN PEJABAT]",
    "NOMOR: [Nomor SK]",
    "",
    `TENTANG`,
    subject.toUpperCase(),
    "",
    "[JABATAN PEJABAT],",
    "",
    "Menimbang:",
    `a. bahwa untuk mendukung ${subject}, perlu ditetapkan keputusan resmi;`,
    "b. bahwa berdasarkan pertimbangan tersebut, perlu menetapkan Keputusan [Jabatan Pejabat].",
    "",
    "Mengingat:",
    "1. [Dasar hukum 1]",
    "2. [Dasar hukum 2]",
    "",
    "MEMUTUSKAN:",
    "",
    `KESATU  : Menetapkan ${subject}.`,
    "KEDUA   : Ketentuan teknis pelaksanaan diatur lebih lanjut oleh unit terkait.",
    "KETIGA  : Keputusan ini berlaku sejak tanggal ditetapkan.",
    "",
    `Ditetapkan di Karawang`,
    `pada tanggal ${today}`,
    "",
    "[Jabatan Penandatangan]",
    "",
    "",
    signer,
    "NIP. [Nomor NIP]",
    "```",
  ].join("\n");
}

function buildProofreadResponse(input: string): string {
  const source = cleanField(input.replace(/^[\s\S]*?:/, ""));
  if (!source || source.length < 5) {
    return [
      "Silakan kirim teks yang ingin dicek ejaan dan tata bahasanya.",
      "",
      "Contoh: `Cek ejaan: kami mengundang bapak ibu untuk menghadiri rapat koordinasi besok.`",
    ].join("\n");
  }

  const corrected = source
    .replace(/\byg\b/gi, "yang")
    .replace(/\butk\b/gi, "untuk")
    .replace(/\bdgn\b/gi, "dengan")
    .replace(/\btdk\b/gi, "tidak")
    .replace(/\bterimakasih\b/gi, "terima kasih")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])([^\s])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  const sentence = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  return [
    "Berikut perbaikan awal ejaan dan tata bahasa:",
    "",
    `> ${sentence}`,
    "",
    "Saya sudah merapikan singkatan umum, spasi, dan tanda baca. Untuk penyuntingan gaya bahasa yang lebih mendalam, provider AI cloud tetap diperlukan.",
  ].join("\n");
}

async function buildSearchResponse(aiTools: any, input: string): Promise<string> {
  const normalized = normalizeIntent(input);
  const query = extractSearchQuery(input);

  if (!query || isPlaceholderPrompt(input)) {
    return [
      "Bisa. Masukkan kata kunci surat yang ingin dicari.",
      "",
      "Contoh: `Cari surat tentang undangan rapat` atau `Cari surat keluar ke Dinas Kesehatan`.",
    ].join("\n");
  }

  const wantsIncoming = normalized.includes("surat masuk");
  const wantsOutgoing = normalized.includes("surat keluar");
  const results: string[] = [];

  if (!wantsOutgoing || wantsIncoming) {
    results.push(await runLocalTool(aiTools, "cari_surat_masuk", { query, limit: 5 }));
  }

  if (!wantsIncoming || wantsOutgoing) {
    results.push(await runLocalTool(aiTools, "cari_surat_keluar", { query, limit: 5 }));
  }

  return [`Hasil pencarian untuk **${query}**:`, "", ...results].join("\n\n");
}

async function buildIncomingSummary(aiTools: any): Promise<string> {
  const result = await aiTools.cari_surat_masuk.execute({ limit: 5 });
  if (result?.error) {
    return formatToolResults([{ toolName: "cari_surat_masuk", result }]);
  }

  const data: any[] = result?.data ?? [];
  if (data.length === 0) {
    return "Belum ada surat masuk yang bisa diringkas saat ini.";
  }

  const rows = data.map((letter, index) => {
    const nomor = letter.nomor_surat ?? "-";
    const pengirim = letter.pengirim ?? "-";
    const perihal = letter.perihal ?? "-";
    const status = letter.status ?? "-";
    return `${index + 1}. **${nomor}** - ${perihal}\n   Pengirim: ${pengirim}\n   Status: ${status}`;
  });

  return [
    "**Ringkasan Eksekutif Surat Masuk Terbaru**",
    "",
    ...rows,
    "",
    "Jika Anda ingin ringkasan isi PDF/detail dokumen tertentu, pilih salah satu surat atau lampirkan file suratnya.",
  ].join("\n");
}

async function handleApprovalSubmit(aiTools: any, input: string): Promise<string> {
  const normalized = normalizeIntent(input);
  const id = extractIdentifier(input);
  const confirmed = /^(ya|iya|ok|oke|lanjutkan|konfirmasi)\b/.test(normalized);

  if (id && confirmed) {
    return runLocalTool(aiTools, "kirim_approval", { id });
  }

  if (id) {
    return [
      `Saya siap mengajukan surat dengan ID \`${id}\` untuk approval.`,
      "",
      `Ketik \`Ya ajukan ${id}\` untuk konfirmasi.`,
    ].join("\n");
  }

  const draftList = await aiTools.cari_surat_keluar.execute({ status: "draft", limit: 5 });
  const rejectedList = await aiTools.cari_surat_keluar.execute({ status: "ditolak", limit: 5 });
  const combined = [...(draftList?.data ?? []), ...(rejectedList?.data ?? [])];

  if (combined.length === 0) {
    return "Tidak ada surat berstatus draft atau ditolak yang siap diajukan untuk approval.";
  }

  const rows = combined
    .slice(0, 5)
    .map((letter: any, index: number) => `${index + 1}. **${letter.nomor_surat}** - ${letter.perihal}\n   ID: \`${letter.id}\`\n   Status: ${letter.status}`)
    .join("\n\n");

  return [
    "Pilih surat yang ingin diajukan untuk approval:",
    "",
    rows,
    "",
    "Balas dengan format: `Ya ajukan <ID surat>`.",
  ].join("\n");
}

async function handleSaveDraft(aiTools: any, input: string): Promise<string> {
  const tujuan = parseKeyValue(input, "tujuan");
  const perihal = parseKeyValue(input, "perihal");

  if (!tujuan || !perihal) {
    return [
      "Saya bisa menyimpan draft, tetapi tujuan dan perihal wajib jelas.",
      "",
      "Gunakan format: `Simpan draft: tujuan=Nama Instansi; perihal=Topik Surat`.",
    ].join("\n");
  }

  return runLocalTool(aiTools, "buat_surat_keluar", {
    nomor_surat: `DRAFT/${Date.now()}`,
    tujuan,
    perihal,
    konten: `Draft surat keluar tentang ${perihal} kepada ${tujuan}.`,
  });
}

async function tryLocalAssistantResponse(messages: any[], aiTools: any, dbUser: any): Promise<string | null> {
  const latest = getLastUserText(messages);
  if (!latest) return null;

  const normalized = normalizeIntent(latest);

  if (hasAny(normalized, ["simpan draft"])) {
    return handleSaveDraft(aiTools, latest);
  }

  if (
    hasAny(normalized, ["kirim approval", "ajukan approval", "ajukan surat", "pengajuan approval", "ajukan untuk approval"]) ||
    (/^(ya|iya|ok|oke|lanjutkan|konfirmasi)\b/.test(normalized) && normalized.includes("ajukan"))
  ) {
    return handleApprovalSubmit(aiTools, latest);
  }

  if (
    hasAny(normalized, ["statistik", "jumlah", "total", "berapa"]) &&
    hasAny(normalized, ["surat", "approval", "persetujuan"])
  ) {
    return runLocalTool(aiTools, "statistik_surat", { dummy: "local" });
  }

  if (hasAny(normalized, ["pending approval", "menunggu approval", "perlu disetujui", "antrian approval"])) {
    return runLocalTool(aiTools, "daftar_pending_approval", { limit: 10 });
  }

  if (hasAny(normalized, ["ringkas", "ringkasan", "resume"]) && normalized.includes("surat")) {
    return buildIncomingSummary(aiTools);
  }

  if (hasAny(normalized, ["cari", "carikan", "temukan"]) && normalized.includes("surat")) {
    return buildSearchResponse(aiTools, latest);
  }

  if (hasAny(normalized, ["cek ejaan", "periksa ejaan", "perbaiki tata bahasa"])) {
    return buildProofreadResponse(latest);
  }

  if (hasAny(normalized, ["draf sk", "draft sk", "surat keputusan"])) {
    if (isPlaceholderPrompt(latest)) return buildSkDetailRequest();
    return buildSkDraft(latest, dbUser);
  }

  if (
    hasAny(normalized, ["buat surat", "buatkan surat", "draf surat", "draft surat", "surat keluar resmi"]) &&
    !normalized.includes("surat masuk")
  ) {
    if (isPlaceholderPrompt(latest)) return buildLetterDetailRequest();
    return buildOutgoingLetterDraft(latest, dbUser);
  }

  return null;
}

function buildProviderUnavailableResponse(errors: Record<string, string>): string {
  const providerNames = Object.keys(errors);
  const checkedProviders = providerNames.length > 0 ? providerNames.join(", ") : "provider AI";

  return [
    "Maaf, provider AI cloud sedang tidak tersedia untuk permintaan bebas saat ini.",
    "",
    `Saya sudah mencoba: ${checkedProviders}. Kemungkinan penyebabnya adalah kuota habis, saldo API kosong, API key tidak valid, atau model provider sedang tidak tersedia.`,
    "",
    "Fitur SIPAS yang tetap bisa dipakai tanpa provider cloud:",
    "- Statistik surat",
    "- Cari surat",
    "- Ringkasan surat masuk terbaru",
    "- Daftar approval",
    "- Template draf surat keluar dan SK",
    "",
    "Coba klik menu Statistik, Cari Surat, Ringkasan, Buat Surat, atau Draf SK lagi. Untuk chat bebas penuh, periksa kembali API key/kuota provider di `.env.local` lalu restart server Next.js.",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    const { messages, model: requestedModel = "nvidia" } = await req.json();
    const chatMessages = Array.isArray(messages) ? messages : [];

    // Check for file attachment in last message
    const lastMessage = chatMessages[chatMessages.length - 1];
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
    const { data: { user: authUser } } = await supabase.auth.getUser();

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

    const localResponse = await tryLocalAssistantResponse(chatMessages, aiTools, dbUser);
    if (localResponse) {
      return streamTextResponse(localResponse, "local");
    }

    let text: string | null = null;
    let usedModel = requestedModel;

    // ── Ordered provider list untuk fallback ──────────────────────────────────
    // Urutan: requested → nvidia → gemini → openrouter
    // DeepSeek dikeluarkan dari fallback otomatis (selalu habis balance)
    type Provider = { name: string; run: () => Promise<string | null> };

    const allProviders: Provider[] = [
      {
        name: "nvidia",
        run: () => {
          if (!nvidiaKey) throw new Error("NVIDIA_API_KEY belum dikonfigurasi.");
          return runNvidia(systemPrompt, chatMessages, aiTools);
        },
      },
      {
        name: "gemini",
        run: () => {
          if (!googleKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY belum dikonfigurasi.");
          return runAI(google("gemini-2.5-flash"), systemPrompt, chatMessages, aiTools);
        },
      },
      {
        name: "deepseek",
        run: () => {
          if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi.");
          return runAI(deepseek("deepseek-chat"), systemPrompt, chatMessages, aiTools);
        },
      },
      {
        name: "openrouter",
        run: () => {
          if (!openrouterKey) throw new Error("OPENROUTER_API_KEY belum dikonfigurasi.");
          return runAI(openrouter("meta-llama/llama-3.3-70b-instruct:free"), systemPrompt, chatMessages, aiTools);
        },
      },
    ];

    // Susun urutan: requested model dulu, lalu sisanya
    const orderedProviders: Provider[] = [
      ...allProviders.filter((p) => p.name === requestedModel),
      ...allProviders.filter((p) => p.name !== requestedModel),
    ];

    const errors: Record<string, string> = {};

    for (const provider of orderedProviders) {
      try {
        console.log(`[AI] Trying provider: ${provider.name}...`);
        text = await provider.run();
        if (text) {
          usedModel = provider.name;
          console.log(`[AI] Success with provider: ${provider.name}`);
          break;
        }
      } catch (err: any) {
        const msg: string = err?.message || String(err);
        errors[provider.name] = msg;
        console.warn(`[AI] Provider ${provider.name} failed: ${msg}`);
        // Lanjut ke provider berikutnya
      }
    }

    if (!text) {
      const errSummary = Object.entries(errors)
        .map(([k, v]) => `${k}: ${v.slice(0, 120)}`)
        .join(" | ");
      console.warn(`[AI] Semua provider gagal: ${errSummary}`);
      text = buildProviderUnavailableResponse(errors);
      usedModel = "local";
    }

    // Append fallback note
    if (usedModel !== requestedModel && usedModel !== "local") {
      const labels: Record<string, string> = {
        nvidia: "NVIDIA Llama 3.1",
        gemini: "Google Gemini",
        deepseek: "DeepSeek",
        openrouter: "OpenRouter",
      };
      text += `\n\n*⚡ Dialihkan ke ${labels[usedModel] ?? usedModel} (${requestedModel} tidak tersedia)*`;
    }

    return streamTextResponse(text, usedModel);
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
