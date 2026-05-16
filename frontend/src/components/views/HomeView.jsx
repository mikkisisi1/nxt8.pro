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

const PRIORITY_TEXT_COLOR = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-sky-400",
  low: "text-brand-turquoise",
};

// Profit tiers: turquoise (normal) → orange (medium) → purple (best).
// Thresholds tuned for live /requests amounts (tokens_total / 4 ≈ 30–250).
function amountTier(amount) {
  if (amount >= 100) return "text-fuchsia-400";
  if (amount >= 50) return "text-orange-400";
  return "text-brand-turquoise";
}

function TaskRow({ index, item }) {
  const done = item.status === "done";
  const titleColor = done
    ? "text-slate-500"
    : PRIORITY_TEXT_COLOR[item.priority] || "text-slate-300";
  const amountColor = amountTier(item.amount);
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
        <span className={`${titleColor} truncate max-w-[140px]`}>
          {item.title}
        </span>
      </div>
      {done ? (
        <div className="text-brand-turquoise/70 italic text-[9px]">done</div>
      ) : (
        <div className={`${amountColor} font-bold text-[14px]`}>
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
        <div className="relative overflow-hidden h-[150px]">
          <div className="text-[11px] tracking-tight space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {tasks.map((t, i) => (
                <TaskRow key={t.key || t.id} index={i + 1} item={t} />
              ))}
            </AnimatePresence>
          </div>
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
          <div className="flex items-center w-full max-w-sm relative gap-2">
            <div className="z-10 px-3 py-2 rounded-lg border border-white/10 bg-brand-dark/40 text-[10px] text-slate-400 uppercase tracking-widest">
              Ingest
            </div>
            <div className="pipe-line relative flex-1 h-4 flex items-center">
              <div className="w-full border-t border-dashed border-brand-turquoise/40"></div>
              <span className="pipe-dot" aria-hidden="true"></span>
              <span className="pipe-dot pipe-dot--delayed" aria-hidden="true"></span>
            </div>
            <div className="z-10 px-5 py-2 rounded-lg border bg-brand-turquoise/10 text-[10px] text-brand-turquoise uppercase tracking-widest pipe-model-pulse">
              Model
            </div>
            <div className="pipe-line relative flex-1 h-4 flex items-center">
              <div className="w-full border-t border-dashed border-brand-turquoise/40"></div>
              <span className="pipe-dot" aria-hidden="true"></span>
              <span className="pipe-dot pipe-dot--delayed" aria-hidden="true"></span>
            </div>
            <div className="z-10 px-3 py-2 rounded-lg border border-white/10 bg-brand-dark/40 text-[10px] text-slate-400 uppercase tracking-widest">
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
  const archiveRef = useRef([]); // chrono-ordered pool of all known requests
  const seenIdsRef = useRef(new Set()); // request ids already loaded into archive
  const cursorRef = useRef(0); // pointer for cyclic recycling
  const bootstrappedRef = useRef(false);
  const tickCounterRef = useRef(0);

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

  // Hybrid live feed:
  //   • Poll /api/requests (limit 30) every 10s — refreshes the archive of real
  //     historic requests, picks up newly-arrived ids.
  //   • Every 5s emit ONE row to the bottom of the visible list. Priority order:
  //       1. genuinely new (never-shown) request → emit it first
  //       2. otherwise cycle through the archive with a synthetic key so React /
  //          framer-motion treat it as a fresh row → smooth rise animation.
  //   • Visible list capped at MAX_VISIBLE_TASKS (oldest at the top is evicted).
  useEffect(() => {
    let mounted = true;
    const pendingNew = []; // queue of fresh tasks not yet emitted

    const refreshArchive = async () => {
      try {
        const list = await api.recentRequests(30);
        if (!mounted || !Array.isArray(list) || list.length === 0) return;
        const chrono = [...list].reverse(); // oldest → newest
        const arrived = [];
        for (const r of chrono) {
          if (!seenIdsRef.current.has(r.id)) {
            seenIdsRef.current.add(r.id);
            archiveRef.current.push(r);
            arrived.push(r);
          }
        }
        // Bootstrap: seed the visible list with the latest N immediately.
        if (!bootstrappedRef.current && archiveRef.current.length > 0) {
          bootstrappedRef.current = true;
          const initial = archiveRef.current
            .slice(-MAX_VISIBLE_TASKS)
            .map((r) => ({ ...mapRequestToTask(r), key: `seed-${r.id}` }));
          setTasks(initial);
          // start cursor right after the seeded window so cycling continues forward
          cursorRef.current = archiveRef.current.length;
          return;
        }
        // Post-bootstrap: queue genuinely new requests for immediate emission.
        for (const r of arrived) {
          pendingNew.push({
            ...mapRequestToTask(r),
            key: `live-${r.id}`,
          });
        }
      } catch {
        /* network blip — ignore */
      }
    };

    const emitOne = () => {
      if (!bootstrappedRef.current || archiveRef.current.length === 0) return;
      let nextTask;
      if (pendingNew.length > 0) {
        nextTask = pendingNew.shift();
      } else {
        const pool = archiveRef.current;
        const r = pool[cursorRef.current % pool.length];
        cursorRef.current += 1;
        tickCounterRef.current += 1;
        nextTask = {
          ...mapRequestToTask(r),
          // synthetic unique key so AnimatePresence treats it as new
          key: `cycle-${tickCounterRef.current}-${r.id}`,
        };
      }
      setTasks((prev) => {
        const appended = [...prev, nextTask];
        return appended.length > MAX_VISIBLE_TASKS
          ? appended.slice(appended.length - MAX_VISIBLE_TASKS)
          : appended;
      });
    };

    refreshArchive();
    const archiveTimer = setInterval(refreshArchive, 10000);
    const emitTimer = setInterval(emitOne, 5000);
    return () => {
      mounted = false;
      clearInterval(archiveTimer);
      clearInterval(emitTimer);
    };
  }, []);

  return (
    <div className="space-y-4">
      <TasksCard tasks={tasks} totalValue={totalValue} />
      <PipelineCard snapshot={snapshot} />
    </div>
  );
}
