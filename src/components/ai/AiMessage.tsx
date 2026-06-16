"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiMessageProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

export function AiMessage({ role, content }: AiMessageProps) {
  if (role === "system" || role === "data") return null;

  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border shadow-sm ${
          isUser 
            ? "bg-brand-100 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-400" 
            : "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white"
        }`}>
          <span className="material-symbols-outlined text-[16px]">
            {isUser ? "person" : "smart_toy"}
          </span>
        </div>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-[20px] text-[13px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-brand-50 text-slate-700 border border-brand-100 rounded-tr-sm dark:bg-brand-900/20 dark:border-brand-500/20 dark:text-slate-300"
            : "bg-white text-slate-700 border border-gray-100 rounded-tl-sm dark:bg-gray-800 dark:border-gray-700 dark:text-slate-300"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="markdown-content space-y-3">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-slate-800 dark:text-white" {...props} />,
                  a: ({node, ...props}) => <a className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                  code: ({node, className, children, ...props}) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md my-2 overflow-hidden">
                        <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1 text-[10px] font-mono text-slate-500 uppercase">{match[1]}</div>
                        <pre className="p-3 overflow-x-auto text-[12px]"><code {...props} className={className}>{children}</code></pre>
                      </div>
                    ) : (
                      <code className="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-md text-[12px] font-mono" {...props}>{children}</code>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
