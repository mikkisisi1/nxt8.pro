import React, { useEffect, useState } from "react";
import api from "../../lib/api";

function StatCard({ label, value, accent = "text-brand-turquoise", testId }) {
  return (
    <div
      className="bg-brand-dark/40 border border-white/5 rounded-xl p-3"
      data-testid={testId}
    >
      <div className="text-[9px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function fmtUsd(n) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}
function fmtPct(n) {
  if (n == null) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

export default function MapView() {
  const [snap, setSnap] = useState(null);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    api.roiCurrent().then(setSnap).catch(() => {});
    api.roiTrend(24).then((d) => setTrend(d.items || [])).catch(() => {});
  }, []);

  const byAgentCost = Object.entries(snap?.by_agent_cost || {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-3" data-testid="map-view">
      <section className="glass-card rounded-2xl window-border glow-turquoise-subtle p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-brand-turquoise font-light text-xs">
            roi.map · hourly
          </span>
          <span className="text-slate-500 text-[10px] uppercase tracking-widest">
            {snap?.alert ? "ALERT" : "stable"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="ROI/h"
            value={fmtPct(snap?.roi)}
            accent={
              snap?.roi != null && snap.roi < 0
                ? "text-orange-400"
                : "text-brand-turquoise"
            }
            testId="roi-card"
          />
          <StatCard
            label="Cost"
            value={fmtUsd(snap?.total_cost)}
            accent="text-orange-400"
            testId="cost-card"
          />
          <StatCard
            label="Revenue"
            value={fmtUsd(snap?.total_revenue)}
            accent="text-emerald-400"
            testId="rev-card"
          />
        </div>
        {snap?.alert && (
          <div
            className="border border-orange-500/30 bg-orange-500/5 rounded-md p-2 text-[11px] text-orange-300"
            data-testid="roi-alert"
          >
            {snap.alert}
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl window-border p-4 space-y-2">
        <div className="text-brand-turquoise font-light text-xs">
          cost.by_agent
        </div>
        {byAgentCost.length === 0 && (
          <div className="text-slate-500 text-xs">нет данных за час</div>
        )}
        {byAgentCost.map(([agent, amount]) => {
          const max = byAgentCost[0][1] || 1;
          const w = Math.min(100, (amount / max) * 100);
          return (
            <div key={agent} data-testid={`bar-${agent}`}>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{agent}</span>
                <span className="text-orange-400">${amount.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-brand-turquoise to-orange-400 rounded-full"
                  style={{ width: `${w}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="glass-card rounded-2xl window-border p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-brand-turquoise font-light text-xs">
            roi.trend · 24h
          </span>
          <span className="text-slate-500 text-[10px]">
            {trend.length} hours
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-20" data-testid="roi-trend-bars">
          {trend.length === 0 && (
            <div className="text-slate-500 text-xs">накапливаю данные…</div>
          )}
          {trend
            .slice()
            .reverse()
            .map((h, i) => {
              const v = h.roi == null ? 0 : h.roi;
              const norm = Math.max(-1, Math.min(1, v));
              const height = `${Math.abs(norm) * 90 + 4}%`;
              const bg = norm < 0 ? "bg-orange-400/70" : "bg-brand-turquoise/70";
              return (
                <div
                  key={h.hour_end || `trend-${i}`}
                  className={`flex-1 ${bg} rounded-sm`}
                  style={{ height }}
                  title={`${(v * 100).toFixed(1)}%`}
                />
              );
            })}
        </div>
      </section>
    </div>
  );
}
