import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Terminal, RefreshCw, AlertCircle, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onRefreshDigest: () => void;
  focusDigest: string | null;
  isDigestLoading: boolean;
}

const QUICK_SUGGESTIONS = [
  "Add a high-priority task: Finish the backend refactor under Coding",
  "Add task: Buy fresh organic coffee under Shopping",
  "Mark my latest tasks as completed",
  "What is my strategic gameplan for today?"
];

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  onRefreshDigest,
  focusDigest,
  isDigestLoading
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-[#1e293b]/50 text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">Sera AI Copilot</h1>
            <p className="text-[10px] font-mono text-emerald-400">STATUS: AGENT_ONLINE</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[10px] font-mono font-medium text-emerald-400">UTC CLOCK</span>
        </div>
      </div>

      {/* Focus Digest Banner / Strategy Advisor */}
      <div className="p-4 bg-slate-900/40 border-b border-[#1e293b]/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-mono font-semibold text-amber-400 tracking-tight">DAILY STRATEGY RECS</h2>
          </div>
          <button 
            onClick={onRefreshDigest}
            disabled={isDigestLoading}
            className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isDigestLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed min-h-[40px] bg-slate-950/40 p-2.5 rounded border border-[#1e293b]/30">
          {isDigestLoading ? (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Analyzing priorities, organizing roadmap...</span>
            </div>
          ) : focusDigest ? (
            <p className="italic font-sans text-slate-300">"{focusDigest}"</p>
          ) : (
            <div className="text-slate-400 flex flex-col gap-1 text-[11px] font-mono">
              <span>No recommendations computed.</span>
              <button 
                onClick={onRefreshDigest}
                className="text-amber-400 underline text-left hover:text-amber-300 cursor-pointer"
              >
                Trigger focus coach diagnostic
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-slate-800 border border-slate-700 text-white rounded-br-none"
                    : "bg-slate-900/80 border border-[#1e293b]/80 text-slate-200 rounded-bl-none"
                }`}
              >
                {msg.text}

                {/* Show structured mutations if agent applied them */}
                {msg.sender === "agent" && msg.actionsApplied && msg.actionsApplied.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                    <p className="text-[10px] font-mono text-emerald-400 font-semibold">EXECUTED MUTATIONS:</p>
                    {msg.actionsApplied.map((act, i) => (
                      <div key={i} className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-400">✔</span>
                        <span>{act.details || `${act.type}: ${act.taskTitle}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-slate-400 mr-auto p-3 bg-slate-900/40 rounded-xl border border-[#1e293b]/40 max-w-[80%]"
          >
            <div className="flex space-x-1.5 items-center py-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px] font-mono text-slate-400">Sera is writing...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions helper panel */}
      {messages.length <= 1 && (
        <div className="p-3 border-t border-[#1e293b]/30 bg-slate-950/30">
          <p className="text-[10px] font-mono text-slate-400 mb-2 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-emerald-400" /> SUGGESTED AGENT INSTRUCTIONS
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-[11px] text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded transition-colors text-left truncate max-w-full cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#080c14] border-t border-[#1e293b]/50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type instructions (e.g. 'Add buy bread under groceries')..."
            className="w-full bg-slate-950/80 border border-[#1e293b] rounded-lg py-2.5 pl-3 pr-10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] font-mono text-slate-500 mt-2 text-center">
          Powered by Gemini 3.5 Flash. Real-time structured mutations applied to client state.
        </p>
      </form>
    </div>
  );
}
