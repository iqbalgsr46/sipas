"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types ---
type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: { role: string; content: string; id: string }[];
};

// --- Quick Prompts ---
const quickPrompts = [
  { icon: "edit_document", label: "Buat Surat", prompt: "Tolong buatkan saya draf surat keluar resmi yang ditujukan kepada..." },
  { icon: "summarize", label: "Ringkasan", prompt: "Berikan saya ringkasan eksekutif dari surat-surat masuk terbaru." },
  { icon: "search", label: "Cari Surat", prompt: "Carikan saya surat yang berkaitan dengan..." },
  { icon: "analytics", label: "Statistik", prompt: "Tampilkan statistik surat masuk dan keluar yang ada di sistem." },
  { icon: "spellcheck", label: "Cek Ejaan", prompt: "Tolong periksa dan perbaiki tata bahasa dari teks berikut:" },
  { icon: "gavel", label: "Draf SK", prompt: "Buatkan saya draf Surat Keputusan (SK) tentang..." },
];

// --- Message component ---
function ChatMessage({ role, content }: { role: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tr-sm px-5 py-3.5 text-[13.5px] leading-relaxed shadow-sm break-words whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-8 group">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">SIPAS AI</p>
        <div className="text-[13.5px] leading-7 text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
              ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
              ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
              li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
              h1: ({ ...props }) => <h1 className="text-lg font-bold mb-3 mt-5 text-slate-800 dark:text-white" {...props} />,
              h2: ({ ...props }) => <h2 className="text-base font-bold mb-2 mt-4 text-slate-800 dark:text-white" {...props} />,
              h3: ({ ...props }) => <h3 className="text-sm font-bold mb-1.5 mt-3 text-slate-700 dark:text-slate-200" {...props} />,
              strong: ({ ...props }) => <strong className="font-semibold text-slate-800 dark:text-white" {...props} />,
              blockquote: ({ ...props }) => <blockquote className="border-l-4 border-indigo-300 pl-4 italic text-slate-500 my-3" {...props} />,
              hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
              table: ({ ...props }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-[12.5px]" {...props} />
                </div>
              ),
              th: ({ ...props }) => <th className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700" {...props} />,
              td: ({ ...props }) => <td className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400" {...props} />,
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-2">
                      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">{match[1]}</span>
                    </div>
                    <pre className="p-4 overflow-x-auto bg-slate-50 dark:bg-slate-900 text-[12px] leading-relaxed">
                      <code className={className} {...props}>{children}</code>
                    </pre>
                  </div>
                ) : (
                  <code className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md text-[12px] font-mono" {...props}>{children}</code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={copyToClipboard} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[11px] transition-colors">
            <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
            {copied ? "Tersalin" : "Salin"}
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-green-500 transition-colors">
            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Typing indicator ---
function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
      </div>
      <div className="flex items-center gap-1.5 h-8">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function AiAssistantPage() {
  const [input, setInput] = useState("");
  const [searchHistory, setSearchHistory] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<{ role: string; content: string; id: string }[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini" | "deepseek">("gemini");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sipas_ai_sessions");
    if (saved) {
      try { setSessions(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("sipas_ai_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // Sync localMessages to sessions
  useEffect(() => {
    if (activeChatId && localMessages.length > 0) {
      setSessions((prev) => {
        const existing = prev.find(s => s.id === activeChatId);
        if (existing) {
          return prev.map(s => s.id === activeChatId ? { ...s, messages: localMessages, updatedAt: Date.now() } : s);
        } else {
          // Buat session baru, bersihkan markdown file dari title
          const firstMsg = localMessages[0]?.content || "";
          let title = firstMsg.split('\n')[0].replace(/\*\(Melampirkan file:.*\)\*/, "").trim();
          title = title.slice(0, 35) + (title.length > 35 ? "..." : "");
          if (!title) title = "Obrolan Baru";
          return [{ id: activeChatId, title, messages: localMessages, updatedAt: Date.now() }, ...prev];
        }
      });
    }
  }, [localMessages, activeChatId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending || isUploading) return;
    setIsSending(true);

    let finalInput = text;
    let fileMeta = "";

    // Handle file upload if exists
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const upRes = await fetch("/api/ai/upload", { method: "POST", body: formData });
        
        if (upRes.ok) {
          const { url, name } = await upRes.json();
          fileMeta = `\n\n*(Melampirkan file: [${name}](${url}))*`;
          finalInput = text + fileMeta;
        } else {
          throw new Error("Gagal mengunggah file");
        }
      } catch (e) {
        setIsSending(false);
        setIsUploading(false);
        alert("Gagal mengunggah file PDF. Pastikan ukuran di bawah 10MB.");
        return;
      }
      setSelectedFile(null);
      setIsUploading(false);
    }

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = Date.now().toString();
      setActiveChatId(currentChatId);
    }

    const userMsg = { role: "user", content: finalInput, id: Date.now().toString() };
    setLocalMessages((prev) => [...prev, userMsg]);
    setInput("");

    const history = localMessages.map(({ role, content }) => ({ role, content }));
    history.push({ role: "user", content: finalInput });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, model: selectedModel }),
      });

      if (!res.ok) {
        // Try to parse error message from server
        let errorMessage = "Terjadi kesalahan saat menghubungi server.";
        try {
          const errorData = await res.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          // response might not be JSON
          errorMessage = `Server error (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = (Date.now() + 1).toString();
      setLocalMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId }]);

      if (reader) {
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setLocalMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          );
        }
        
        if (!accumulated) {
          throw new Error("AI tidak memberikan respons. Coba lagi.");
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
      setLocalMessages((prev) => {
        // Jika bubble assistant sudah terbuat tapi kosong/error, timpa isinya
        const exists = prev.some(m => m.role === "assistant" && m.content === "");
        if (exists) {
          return prev.map(m => m.role === "assistant" && m.content === "" ? { ...m, content: `Maaf, ${errorMessage}` } : m);
        }
        return [
          ...prev,
          { role: "assistant", content: `Maaf, ${errorMessage}`, id: Date.now().toString() },
        ];
      });
    } finally {
      setIsSending(false);
    }
  }, [localMessages, isSending, isUploading, selectedFile, activeChatId]);

  const handleSend = (text = input) => {
    if ((!text.trim() && !selectedFile) || isSending || isUploading) return;
    sendMessage(text || "Tolong periksa file lampiran ini.");
  };

  const handleNewChat = () => {
    setLocalMessages([]);
    setActiveChatId(null);
  };

  const loadChat = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveChatId(id);
      setLocalMessages(session.messages);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const now = Date.now();
  const dayMs = 86400000;
  
  const groupedHistory = {
    today: sessions.filter((h) => now - h.updatedAt < dayMs).sort((a,b) => b.updatedAt - a.updatedAt),
    yesterday: sessions.filter((h) => now - h.updatedAt >= dayMs && now - h.updatedAt < dayMs * 2).sort((a,b) => b.updatedAt - a.updatedAt),
    last_week: sessions.filter((h) => now - h.updatedAt >= dayMs * 2).sort((a,b) => b.updatedAt - a.updatedAt),
  };

  const filteredHistory = (items: ChatSession[]) =>
    items.filter((h) => h.title.toLowerCase().includes(searchHistory.toLowerCase()));

  const isEmpty = localMessages.length === 0;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-4 md:-m-6 overflow-hidden">
      {/* ── LEFT / MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[300px]">
              {activeChatId ? sessions.find((h) => h.id === activeChatId)?.title : "Obrolan Baru"}
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Model badge */}
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              selectedModel === "deepseek"
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                : "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
            }`}>
              {selectedModel === "deepseek" ? (
                <svg width="13" height="13" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M33.4671 19.2359C33.2879 19.1108 33.0627 19.0706 32.8502 19.1257C31.5862 19.4663 30.2469 19.2844 29.1197 18.622C28.8108 18.4392 28.4253 18.4784 28.1599 18.7197C27.4197 19.4001 26.9997 20.3601 26.9997 21.3734C26.9997 22.1467 27.2505 22.8867 27.7119 23.4934L22.5253 29.5467C21.9944 29.1759 21.3558 28.9733 20.6972 28.9733C20.3021 28.9733 19.9164 29.0466 19.5557 29.1866L15.8379 22.9867C16.1261 22.4934 16.2663 21.9267 16.2663 21.3467C16.2663 19.5199 14.7797 18.0266 12.9663 18.0266C11.1529 18.0266 9.66634 19.5199 9.66634 21.3467C9.66634 23.1734 11.1529 24.6667 12.9663 24.6667C13.3851 24.6667 13.7901 24.5867 14.1637 24.4401L17.8637 30.6134C17.5357 31.1334 17.3597 31.7334 17.3597 32.3601C17.3597 34.1867 18.8463 35.6801 20.6597 35.6801C22.4731 35.6801 23.9597 34.1867 23.9597 32.3601C23.9597 31.8667 23.8464 31.3867 23.6331 30.9601L28.7931 24.9334C29.3573 25.2134 29.9863 25.3601 30.6263 25.3601C31.213 25.3601 31.7863 25.2401 32.313 25.0134L35.2263 28.9334C34.7597 29.4267 34.493 30.08 34.493 30.7734C34.493 32.3467 35.773 33.6267 37.3464 33.6267C38.9197 33.6267 40.1997 32.3467 40.1997 30.7734C40.1997 29.2001 38.9197 27.9201 37.3464 27.9201C37.1064 27.9201 36.873 27.9467 36.6464 28.0001L33.7464 24.0934C34.2663 23.4534 34.5597 22.6401 34.5597 21.7867C34.5597 20.8534 34.2263 19.9601 33.6131 19.2734L33.4671 19.2359Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="currentColor"/>
                </svg>
              )}
              {selectedModel === "deepseek" ? "DeepSeek" : "Gemini"}
            </span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[12px] font-medium transition-colors hover:border-slate-300 dark:hover:border-slate-600">
              <span className="material-symbols-outlined text-[15px]">share</span>
              Bagikan
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
          {isEmpty ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center h-full pb-12 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 mb-5">
                <span className="material-symbols-outlined text-[32px]">smart_toy</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1.5">Halo! Saya SIPAS AI.</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
                Saya siap membantu Anda mengelola persuratan, membuat draf, meringkas, atau mencari surat dengan cerdas.
              </p>
              {/* Quick prompts grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 w-full max-w-lg">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.prompt)}
                    className="flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
                  >
                    <span className="material-symbols-outlined text-[20px] text-indigo-500 group-hover:scale-110 transition-transform">{qp.icon}</span>
                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {localMessages.map((m) => (
                <ChatMessage key={m.id} role={m.role} content={m.content} />
              ))}
              {isSending && localMessages[localMessages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-6 pb-5 pt-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-xl text-[12px] w-max max-w-full">
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span className="truncate font-medium">{selectedFile.name}</span>
                <span className="text-indigo-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button onClick={() => setSelectedFile(null)} className="ml-2 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}
            <div className="relative bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:shadow-md transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pesan atau pertanyaan Anda di sini..."
                className="w-full bg-transparent text-[13.5px] text-slate-800 dark:text-white placeholder:text-slate-400 px-5 pt-4 pb-3 resize-none focus:outline-none max-h-[160px] min-h-[52px] leading-relaxed"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Lampirkan File PDF"
                  >
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  </button>
                  {/* Model picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelPicker((v) => !v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all border ${
                        selectedModel === "deepseek"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                      }`}
                    >
                      {selectedModel === "deepseek" ? (
                        <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M33.4671 19.2359C33.2879 19.1108 33.0627 19.0706 32.8502 19.1257C31.5862 19.4663 30.2469 19.2844 29.1197 18.622C28.8108 18.4392 28.4253 18.4784 28.1599 18.7197C27.4197 19.4001 26.9997 20.3601 26.9997 21.3734C26.9997 22.1467 27.2505 22.8867 27.7119 23.4934L22.5253 29.5467C21.9944 29.1759 21.3558 28.9733 20.6972 28.9733C20.3021 28.9733 19.9164 29.0466 19.5557 29.1866L15.8379 22.9867C16.1261 22.4934 16.2663 21.9267 16.2663 21.3467C16.2663 19.5199 14.7797 18.0266 12.9663 18.0266C11.1529 18.0266 9.66634 19.5199 9.66634 21.3467C9.66634 23.1734 11.1529 24.6667 12.9663 24.6667C13.3851 24.6667 13.7901 24.5867 14.1637 24.4401L17.8637 30.6134C17.5357 31.1334 17.3597 31.7334 17.3597 32.3601C17.3597 34.1867 18.8463 35.6801 20.6597 35.6801C22.4731 35.6801 23.9597 34.1867 23.9597 32.3601C23.9597 31.8667 23.8464 31.3867 23.6331 30.9601L28.7931 24.9334C29.3573 25.2134 29.9863 25.3601 30.6263 25.3601C31.213 25.3601 31.7863 25.2401 32.313 25.0134L35.2263 28.9334C34.7597 29.4267 34.493 30.08 34.493 30.7734C34.493 32.3467 35.773 33.6267 37.3464 33.6267C38.9197 33.6267 40.1997 32.3467 40.1997 30.7734C40.1997 29.2001 38.9197 27.9201 37.3464 27.9201C37.1064 27.9201 36.873 27.9467 36.6464 28.0001L33.7464 24.0934C34.2663 23.4534 34.5597 22.6401 34.5597 21.7867C34.5597 20.8534 34.2263 19.9601 33.6131 19.2734L33.4671 19.2359Z" fill="currentColor"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="currentColor"/>
                        </svg>
                      )}
                      {selectedModel === "deepseek" ? "DeepSeek Chat" : "Gemini 2.5 Flash"}
                      <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </button>

                    {showModelPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowModelPicker(false)} />
                        <div className="absolute bottom-full left-0 mb-2 z-20 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden w-[220px]">
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pilih Model AI</p>
                          <button
                            onClick={() => { setSelectedModel("gemini"); setShowModelPicker(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                              selectedModel === "gemini" ? "bg-purple-50 dark:bg-purple-900/20" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-gray-800 border border-slate-100 dark:border-slate-700">
                              {/* Gemini official logo */}
                              <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="url(#gemini_gradient)"/>
                                <defs>
                                  <linearGradient id="gemini_gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4285F4"/>
                                    <stop offset="0.5" stopColor="#9B72CB"/>
                                    <stop offset="1" stopColor="#D96570"/>
                                  </linearGradient>
                                </defs>
                              </svg>
                            </div>
                            <div>
                              <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">Gemini 2.5 Flash</p>
                              <p className="text-[10.5px] text-slate-400">Google · Ada limit gratis</p>
                            </div>
                            {selectedModel === "gemini" && <span className="material-symbols-outlined text-[16px] text-purple-500 ml-auto">check_circle</span>}
                          </button>
                          <button
                            onClick={() => { setSelectedModel("deepseek"); setShowModelPicker(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                              selectedModel === "deepseek" ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[#4D6BFE]">
                              {/* DeepSeek official logo */}
                              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.33301 24C5.33301 13.6907 13.6904 5.33325 23.9997 5.33325C34.309 5.33325 42.6663 13.6907 42.6663 24C42.6663 34.3093 34.309 42.6666 23.9997 42.6666C13.6904 42.6666 5.33301 34.3093 5.33301 24Z" fill="#4D6BFE"/>
                                <path d="M33.4671 19.2359C33.2879 19.1108 33.0627 19.0706 32.8502 19.1257C31.5862 19.4663 30.2469 19.2844 29.1197 18.622C28.8108 18.4392 28.4253 18.4784 28.1599 18.7197C27.4197 19.4001 26.9997 20.3601 26.9997 21.3734C26.9997 22.1467 27.2505 22.8867 27.7119 23.4934L22.5253 29.5467C21.9944 29.1759 21.3558 28.9733 20.6972 28.9733C20.3021 28.9733 19.9164 29.0466 19.5557 29.1866L15.8379 22.9867C16.1261 22.4934 16.2663 21.9267 16.2663 21.3467C16.2663 19.5199 14.7797 18.0266 12.9663 18.0266C11.1529 18.0266 9.66634 19.5199 9.66634 21.3467C9.66634 23.1734 11.1529 24.6667 12.9663 24.6667C13.3851 24.6667 13.7901 24.5867 14.1637 24.4401L17.8637 30.6134C17.5357 31.1334 17.3597 31.7334 17.3597 32.3601C17.3597 34.1867 18.8463 35.6801 20.6597 35.6801C22.4731 35.6801 23.9597 34.1867 23.9597 32.3601C23.9597 31.8667 23.8464 31.3867 23.6331 30.9601L28.7931 24.9334C29.3573 25.2134 29.9863 25.3601 30.6263 25.3601C31.213 25.3601 31.7863 25.2401 32.313 25.0134L35.2263 28.9334C34.7597 29.4267 34.493 30.08 34.493 30.7734C34.493 32.3467 35.773 33.6267 37.3464 33.6267C38.9197 33.6267 40.1997 32.3467 40.1997 30.7734C40.1997 29.2001 38.9197 27.9201 37.3464 27.9201C37.1064 27.9201 36.873 27.9467 36.6464 28.0001L33.7464 24.0934C34.2663 23.4534 34.5597 22.6401 34.5597 21.7867C34.5597 20.8534 34.2263 19.9601 33.6131 19.2734L33.4671 19.2359Z" fill="white"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">DeepSeek Chat</p>
                              <p className="text-[10.5px] text-slate-400">DeepSeek · Tanpa limit</p>
                            </div>
                            {selectedModel === "deepseek" && <span className="material-symbols-outlined text-[16px] text-blue-500 ml-auto">check_circle</span>}
                          </button>
                          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 leading-relaxed">Gemini akan otomatis beralih ke DeepSeek jika terkena limit.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !selectedFile) || isSending || isUploading}
                    className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:bg-indigo-600 dark:hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isUploading ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] ml-0.5">send</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-[10.5px] text-slate-400 mt-2">
              SIPAS AI dapat membuat kesalahan. Selalu periksa informasi penting sebelum ditindaklanjuti.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR / HISTORY ── */}
      <div className="w-[260px] shrink-0 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-gray-950 flex flex-col hidden lg:flex">
        {/* New Chat button */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Obrolan Baru
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-[16px] text-slate-400">search</span>
            <input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Cari riwayat..."
              className="flex-1 bg-transparent text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
          {filteredHistory(groupedHistory.today).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1.5">Hari Ini</p>
              {filteredHistory(groupedHistory.today).map((h) => (
                <div key={h.id} className="relative group w-full">
                  <button onClick={() => loadChat(h.id)} className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] leading-snug transition-colors pr-8 truncate ${activeChatId === h.id ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {h.title}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(s => s.id !== h.id)); if (activeChatId === h.id) handleNewChat(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {filteredHistory(groupedHistory.yesterday).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1.5">Kemarin</p>
              {filteredHistory(groupedHistory.yesterday).map((h) => (
                <div key={h.id} className="relative group w-full">
                  <button onClick={() => loadChat(h.id)} className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] leading-snug transition-colors pr-8 truncate ${activeChatId === h.id ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {h.title}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(s => s.id !== h.id)); if (activeChatId === h.id) handleNewChat(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {filteredHistory(groupedHistory.last_week).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1.5">Minggu Lalu</p>
              {filteredHistory(groupedHistory.last_week).map((h) => (
                <div key={h.id} className="relative group w-full">
                  <button onClick={() => loadChat(h.id)} className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] leading-snug transition-colors pr-8 truncate ${activeChatId === h.id ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {h.title}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(s => s.id !== h.id)); if (activeChatId === h.id) handleNewChat(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {filteredHistory([...groupedHistory.today, ...groupedHistory.yesterday, ...groupedHistory.last_week]).length === 0 && (
            <div className="text-center py-8 text-slate-400 text-[12px]">
              <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">chat_bubble_outline</span>
              <p>Tidak ada riwayat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
