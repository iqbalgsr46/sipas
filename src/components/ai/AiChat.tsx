"use client";

import { useState, useRef, useEffect } from "react";
import { AiMessage } from "./AiMessage";
import { AiTypingIndicator } from "./AiTypingIndicator";
import { AiQuickActions } from "./AiQuickActions";

type Message = { id: string; role: string; content: string };

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini" | "deepseek" | "nvidia">("nvidia"); // Default NVIDIA (free)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;
    setIsSending(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Terjadi kesalahan saat menghubungi server.";
        try {
          const errorData = await res.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          );
        }
        
        if (!accumulated) {
          throw new Error("AI tidak memberikan respons. Coba lagi.");
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
      setMessages((prev) => {
        const exists = prev.some(m => m.id === assistantId && m.content === "");
        if (exists) {
          return prev.map(m => m.id === assistantId && m.content === "" ? { ...m, content: `Maaf, ${errorMessage}` } : m);
        }
        return prev.map((m) => m.id === assistantId
          ? { ...m, content: `Maaf, ${errorMessage}` }
          : m
        );
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}`}
      >
        <span className="material-symbols-outlined text-[28px]">smart_toy</span>
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[85vh] max-w-[calc(100vw-32px)] bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-[24px] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white leading-tight">SIPAS AI</h3>
                <p className="text-[11px] text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span> Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 flex items-center justify-center text-slate-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          
          {/* Model Selector */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setSelectedModel("nvidia")}
              disabled={isSending}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                selectedModel === "nvidia"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                🚀 NVIDIA
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">FREE</span>
              </span>
            </button>
            <button
              onClick={() => setSelectedModel("gemini")}
              disabled={isSending}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                selectedModel === "gemini"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                ✨ Gemini
              </span>
            </button>
            <button
              onClick={() => setSelectedModel("deepseek")}
              disabled={isSending}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                selectedModel === "deepseek"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                🔍 DeepSeek
              </span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-4 opacity-70">
              <span className="material-symbols-outlined text-[48px] text-indigo-300">forum</span>
              <div>
                <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-1">Hai! Saya AI Asisten SIPAS.</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Saya siap membantu Anda membuat surat, meringkas, atau mencari data persuratan.</p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <AiMessage key={m.id} role={m.role as "user" | "assistant"} content={m.content} />
          ))}

          {isSending && messages[messages.length - 1]?.role === "user" && (
            <div className="mb-4">
              <AiTypingIndicator />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0 flex flex-col gap-2">
          {messages.length === 0 && <AiQuickActions onSelect={handleQuickAction} />}

          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik permintaan ke AI..."
              className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-slate-800 dark:text-white text-[13px] rounded-[16px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none min-h-[44px] max-h-[120px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
            </button>
          </form>
          <div className="text-center">
            <span className="text-[10px] text-slate-400">AI dapat membuat kesalahan. Periksa info penting.</span>
          </div>
        </div>
      </div>
    </>
  );
}
