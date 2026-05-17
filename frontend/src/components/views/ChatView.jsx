import React, { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../../lib/api";
import CollapsibleCard from "../CollapsibleCard";

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
        <div className="whitespace-pre-wrap break-words">
          {msg.content}
          {!isUser && msg.meta?.streaming && (
            <span className="ml-0.5 inline-block w-1.5 h-3.5 bg-brand-turquoise animate-pulse align-middle" />
          )}
        </div>
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
      id: "msg-welcome",
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
    const userId = `msg-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const aiId = `msg-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: text },
      {
        id: aiId,
        role: "assistant",
        content: "",
        meta: {
          confidence: 0,
          confidence_level: "low",
          intent: "...",
          latency_ms: 0,
          should_escalate: false,
          verification_status: "pending",
          mock: false,
          streaming: true,
        },
      },
    ]);
    setLoading(true);

    let aggregated = "";
    let meta = { intent: "..." };

    try {
      await api.chatStream(
        { user_id: "demo", session_id: sessionRef.current, message: text },
        {
          onMeta: (m) => {
            meta = { ...meta, ...m };
            setMessages((msgs) => {
              const last = msgs.length - 1;
              const updated = [...msgs];
              updated[last] = {
                ...updated[last],
                meta: { ...updated[last].meta, intent: m.intent || meta.intent },
              };
              return updated;
            });
          },
          onDelta: (chunk) => {
            aggregated += chunk;
            setMessages((msgs) => {
              const last = msgs.length - 1;
              const updated = [...msgs];
              updated[last] = { ...updated[last], content: aggregated };
              return updated;
            });
          },
          onDone: (payload) => {
            setMessages((msgs) => {
              const last = msgs.length - 1;
              const updated = [...msgs];
              updated[last] = {
                ...updated[last],
                content: aggregated || "(пустой ответ)",
                meta: {
                  confidence: payload.confidence,
                  confidence_level: payload.confidence_level,
                  intent: payload.intent || meta.intent,
                  latency_ms: payload.latency_ms,
                  should_escalate: payload.should_escalate,
                  verification_status: payload.verification_status,
                  mock: false,
                  streaming: false,
                  provider: payload.provider,
                },
              };
              return updated;
            });
          },
          onError: (err) => {
            setMessages((msgs) => {
              const last = msgs.length - 1;
              const updated = [...msgs];
              updated[last] = {
                ...updated[last],
                content: `Ошибка соединения: ${err}`,
                meta: {
                  ...updated[last].meta,
                  streaming: false,
                  should_escalate: true,
                  verification_status: "unverified",
                  confidence_level: "low",
                },
              };
              return updated;
            });
          },
        }
      );
    } catch (e) {
      setMessages((msgs) => {
        const last = msgs.length - 1;
        const updated = [...msgs];
        updated[last] = {
          ...updated[last],
          content: `Ошибка соединения: ${e.message}`,
          meta: {
            ...updated[last].meta,
            streaming: false,
            should_escalate: true,
            confidence_level: "low",
          },
        };
        return updated;
      });
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
    <CollapsibleCard
      storageKey="chat-console"
      testId="chat-view"
      title={
        <span className="text-brand-turquoise font-light text-xs">
          cmd.console
        </span>
      }
      titleRight={
        <span className="text-slate-500 text-[10px] uppercase tracking-widest">
          session {sessionRef.current.slice(-6)}
        </span>
      }
      bodyClassName="px-4 pb-4 pt-0"
    >
      <div
        className="flex flex-col h-[62vh] min-h-[420px]"
      >
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1"
          data-testid="chat-messages"
        >
          {messages.map((m, i) => (
            <MessageBubble key={m.id || `msg-${i}`} msg={m} />
          ))}
          {loading && messages[messages.length - 1]?.meta?.streaming && !messages[messages.length - 1]?.content && (
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
      </div>
    </CollapsibleCard>
  );
}
