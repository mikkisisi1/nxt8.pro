import React, { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../../lib/api";

function confidenceClass(level) {
  if (level === "high") return "confidence-high";
  if (level === "medium") return "confidence-medium";
  return "confidence-low";
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`msg-${msg.role}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
          isUser ? "bubble-user" : "bubble-ai"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        {!isUser && msg.meta && (
          <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-2 text-[9px] uppercase tracking-widest">
            <span
              className={`px-2 py-0.5 rounded-md bg-brand-dark/60 ${confidenceClass(
                msg.meta.confidence_level
              )}`}
              data-testid="msg-confidence"
            >
              conf {(msg.meta.confidence * 100).toFixed(0)}%
            </span>
            <span className="px-2 py-0.5 rounded-md bg-brand-dark/60 text-slate-400">
              intent · {msg.meta.intent}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-brand-dark/60 text-slate-400">
              {msg.meta.latency_ms}ms
            </span>
            {msg.meta.should_escalate && (
              <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> escalate
              </span>
            )}
            {msg.meta.verification_status === "verified" && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> verified
              </span>
            )}
            {msg.meta.mock && (
              <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400">
                MOCK
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatView() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Я NXT8. Спрашивайте про корпоративные знания, ROI, сотрудников и задачи. Каждый мой ответ сопровождается confidence score и проверкой против корпоративной памяти.",
      meta: {
        confidence: 0.92,
        confidence_level: "high",
        intent: "general",
        latency_ms: 0,
        should_escalate: false,
        verification_status: "verified",
        mock: false,
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef(
    `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  );
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await api.chat({
        user_id: "demo",
        session_id: sessionRef.current,
        message: text,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.content || "(пустой ответ)",
          meta: {
            confidence: res.confidence,
            confidence_level: res.confidence_level,
            intent: res.intent,
            latency_ms: res.latency_ms,
            should_escalate: res.should_escalate,
            verification_status: res.verification_status,
            mock: res.mock,
          },
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Ошибка соединения: ${e.message}`,
          meta: {
            confidence: 0,
            confidence_level: "low",
            intent: "general",
            latency_ms: 0,
            should_escalate: true,
            verification_status: "unverified",
            mock: false,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section
      className="glass-card rounded-2xl window-border glow-turquoise-subtle p-4 flex flex-col h-[68vh] min-h-[480px]"
      data-testid="chat-view"
    >
      <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
        <span className="text-brand-turquoise font-light text-xs">
          cmd.console
        </span>
        <span className="text-slate-500 text-[10px] uppercase tracking-widest">
          session {sessionRef.current.slice(-6)}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1"
        data-testid="chat-messages"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bubble-ai rounded-2xl px-4 py-3 text-xs text-slate-400">
              думаю<span className="animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Спросите NXT8…"
          className="flex-1 bg-brand-dark/60 border border-white/10 rounded-full px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-brand-turquoise/50"
          data-testid="chat-input"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="neo-btn rounded-full p-2.5 text-brand-turquoise disabled:opacity-40"
          data-testid="chat-send"
          aria-label="send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
