import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../lib/api";

function PriorityBadge({ level }) {
  const map = {
    critical: { color: "text-red-500", mark: "!!", label: "CRITICAL" },
    high: { color: "text-orange-500", mark: "!", label: "HIGH" },
    medium: { color: "text-blue-500", mark: ">", label: "MEDIUM" },
    low: { color: "text-brand-turquoise", mark: "·", label: "LOW" },
  };
  const m = map[level] || map.medium;
  return (
    <>
      <span className={`${m.color} font-bold`}>{m.mark}</span>
      <span className={`${m.color} uppercase font-light text-[9px]`}>
        {m.label}
      </span>
    </>
  );
}

function TaskRow({ index, item }) {
  const done = item.status === "done";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: done ? 0.5 : 0.9, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 32 },
        opacity: { duration: 0.35 },
        y: { type: "spring", stiffness: 320, damping: 28 },
        scale: { duration: 0.3 },
      }}
      className="flex items-center justify-between"
      data-testid={`task-row-${index}`}
    >
      <div className="flex items-center space-x-4 min-w-0">
        <span className="text-slate-600 w-4">{index}</span>
        {done ? (
          <>
            <span className="text-brand-turquoise">✓</span>
            <span className="text-brand-turquoise font-light text-[9px]">
              high
            </span>
          </>
        ) : (
          <PriorityBadge level={item.priority} />
        )}
        <span className="text-slate-300 truncate max-w-[140px]">
          {item.title}
        </span>
      </div>
      {done ? (
        <div className="text-brand-turquoise/70 italic text-[9px]">done</div>
      ) : (
        <div className="text-orange-500 font-bold text-[14px]">
          ${item.amount}
        </div>
      )}
    </motion.div>
  );
}

function TasksCard({ tasks, totalValue }) {
  return (
    <section
      className="glass-card rounded-2xl p-5 glow-turquoise window-border min-h-[260px] flex flex-col justify-between"
      data-testid="tasks-card"
    >
      <div>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-brand-turquoise font-light">tasks.nxt</span>
            <span className="text-slate-500">—</span>
            <span className="text-orange-400 font-light">${totalValue}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-orange-400 text-xs font-light">
              {tasks.filter((t) => t.status !== "done").length} tasks
            </span>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <div className="text-[11px] tracking-tight space-y-2.5">
          <AnimatePresence initial={false}>
            {tasks.map((t, i) => (
              <TaskRow key={t.id} index={i + 1} item={t} />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center space-x-3 text-slate-500 text-xs">
          <span className="font-light">› New task…</span>
        </div>
        <button
          className="text-brand-turquoise text-[10px] font-bold px-4 py-1 rounded-lg uppercase tracking-widest neo-btn"
          data-testid="tasks-run-button"
        >
          RUN
        </button>
      </div>
    </section>
  );
}

function PipelineCard({ snapshot }) {
  const roiPct =
    snapshot?.roi == null ? "—" : `${(snapshot.roi * 100).toFixed(1)}%`;
  const cost = snapshot?.total_cost?.toFixed(2) ?? "0.00";
  const revenue = snapshot?.total_revenue?.toFixed(2) ?? "0.00";

  return (
    <section
      className="glass-card rounded-2xl p-5 glow-turquoise window-border min-h-[260px] flex flex-col"
      data-testid="pipeline-card"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-3">
          <span className="text-slate-500 text-[10px] font-light tracking-tight">
            // ai_index.growth
          </span>
        </div>
        <div className="flex items-center bg-brand-dark/50 rounded-lg p-0.5 border border-white/10 text-[9px] text-slate-400">
          <button className="px-2 py-1 rounded-md">7d</button>
          <button className="px-3 py-1 rounded-md text-white font-bold neo-btn">
            30d
          </button>
          <button className="px-2 py-1 rounded-md">90d</button>
        </div>
      </div>
      <div className="flex-grow relative overflow-hidden rounded-lg flex items-center justify-center p-2">
        <div className="w-full flex flex-col items-center justify-center space-y-6 py-2">
          <div className="flex items-center justify-between w-full max-w-sm relative px-4">
            <div className="absolute left-[25%] right-[65%] top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="w-full border-t border-dashed border-brand-turquoise/40"></div>
              <div className="absolute w-1.5 h-1.5 bg-brand-turquoise rounded-full dot-pulse animate-flicker"></div>
            </div>
            <div className="z-10 px-4 py-2 rounded-lg border border-white/10 bg-brand-dark/40 text-[10px] text-slate-400 uppercase tracking-widest">
              Ingest
            </div>
            <div className="z-10 px-6 py-2 rounded-lg border border-brand-turquoise/50 bg-brand-turquoise/10 text-[10px] text-brand-turquoise uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2),inset_0_0_10px_rgba(6,182,212,0.1)]">
              Model
            </div>
            <div className="absolute left-[65%] right-[25%] top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="w-full border-t border-dashed border-brand-turquoise/40"></div>
              <div className="absolute w-1.5 h-1.5 bg-brand-turquoise rounded-full dot-pulse animate-flicker"></div>
            </div>
            <div className="z-10 px-4 py-2 rounded-lg border border-white/10 bg-brand-dark/40 text-[10px] text-slate-400 uppercase tracking-widest">
              Output
            </div>
          </div>
          <div className="w-full grid grid-cols-3 gap-3 text-center pt-2">
            <div className="border border-white/5 rounded-lg p-2">
              <div className="text-[9px] text-slate-500 uppercase">ROI/h</div>
              <div
                className="text-brand-turquoise text-sm font-bold"
                data-testid="pipeline-roi"
              >
                {roiPct}
              </div>
            </div>
            <div className="border border-white/5 rounded-lg p-2">
              <div className="text-[9px] text-slate-500 uppercase">Cost</div>
              <div
                className="text-orange-400 text-sm font-bold"
                data-testid="pipeline-cost"
              >
                ${cost}
              </div>
            </div>
            <div className="border border-white/5 rounded-lg p-2">
              <div className="text-[9px] text-slate-500 uppercase">Rev</div>
              <div
                className="text-emerald-400 text-sm font-bold"
                data-testid="pipeline-revenue"
              >
                ${revenue}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 pt-3 text-center">
        <span className="font-light tracking-widest uppercase text-brand-turquoise text-[9px] animate-flicker">
          NXT8 → MONEY EVERY MINUTE | 24/7
        </span>
      </div>
    </section>
  );
}

const MAX_VISIBLE_TASKS = 5;

function mapRequestToTask(req) {
  let priority;
  if (req.should_escalate) priority = "critical";
  else if (req.confidence_level === "low") priority = "high";
  else if (req.confidence_level === "medium") priority = "medium";
  else priority = "low";

  const status = req.verification_status === "verified" ? "done" : "open";
  const rawTitle = (req.message || "").trim() || "(no message)";
  const title =
    rawTitle.length > 38 ? `${rawTitle.slice(0, 38).trim()}…` : rawTitle;

  return {
    id: req.id,
    title,
    priority,
    amount: Math.max(1, Math.round((req.tokens_total || 0) / 4)),
    status,
  };
}

export default function HomeView() {
  const [snapshot, setSnapshot] = useState(null);
  const [tasks, setTasks] = useState([]);
  const seenIdsRef = useRef(new Set());
  const bootstrappedRef = useRef(false);

  const totalValue = tasks
    .filter((t) => t.status !== "done")
    .reduce((acc, t) => acc + t.amount, 0);

  useEffect(() => {
    let mounted = true;
    api.roiCurrent().then(
      (d) => mounted && setSnapshot(d),
      () => {}
    );
    return () => {
      mounted = false;
    };
  }, []);

  // Poll real /requests feed. On first load: seed list with the latest N (oldest→newest).
  // On subsequent polls: detect new request ids and append them to the bottom, oldest
  // rows drop off the top once we exceed MAX_VISIBLE_TASKS. AnimatePresence + layout
  // give us the smooth "rise" effect.
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const list = await api.recentRequests(20);
        if (!mounted || !Array.isArray(list)) return;
        // backend returns newest-first; flip to chronological so newest appends last
        const chrono = [...list].reverse();

        if (!bootstrappedRef.current) {
          const initial = chrono.slice(-MAX_VISIBLE_TASKS);
          initial.forEach((r) => seenIdsRef.current.add(r.id));
          setTasks(initial.map(mapRequestToTask));
          bootstrappedRef.current = true;
          return;
        }

        const fresh = chrono.filter((r) => !seenIdsRef.current.has(r.id));
        if (fresh.length === 0) return;
        fresh.forEach((r) => seenIdsRef.current.add(r.id));

        setTasks((prev) => {
          const appended = [...prev, ...fresh.map(mapRequestToTask)];
          return appended.length > MAX_VISIBLE_TASKS
            ? appended.slice(appended.length - MAX_VISIBLE_TASKS)
            : appended;
        });
      } catch {
        // network blip — skip this tick
      }
    };

    poll();
    const t = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="space-y-4">
      <TasksCard tasks={tasks} totalValue={totalValue} />
      <PipelineCard snapshot={snapshot} />
    </div>
  );
}
