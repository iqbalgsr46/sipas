"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: Toast["type"], title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const iconMap = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

const styleMap = {
  success: "bg-[#e8f5e9] border-[#4caf50] text-[#1b5e20]",
  error: "bg-[#ffebee] border-[#ef5350] text-[#b71c1c]",
  info: "bg-[#e3f2fd] border-[#42a5f5] text-[#0d47a1]",
  warning: "bg-[#fff3e0] border-[#ff9800] text-[#e65100]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast["type"], title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border-l-4 shadow-lg backdrop-blur-sm min-w-[320px] max-w-[420px] animate-slide-up ${styleMap[toast.type]}`}
          >
            <span className="material-symbols-outlined text-[22px] mt-0.5 shrink-0">
              {iconMap[toast.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-inter text-sm font-semibold">{toast.title}</p>
              {toast.message && (
                <p className="font-inter text-xs mt-0.5 opacity-80">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 p-0.5 rounded-full hover:bg-black/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
