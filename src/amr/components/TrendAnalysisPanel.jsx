import React, { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Info, CalendarClock } from "lucide-react";
import { buildResistanceTrends, compareLatestPeriods } from "../lib/trendAnalysis.js";

const GRANULARITIES = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

function Sparkline({ points, width = 160, height = 36 }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.pctSusceptible);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.pctSusceptible - min) / range) * height;
    return [x, y];
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={coords.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand/70" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} className="fill-brand" />
      ))}
    </svg>
  );
}

function TrendBadge({ trend }) {
  if (trend.direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 rounded-full px-2 py-0.5">
        <TrendingUp size={12} /> {trend.label}
      </span>
    );
  }
  if (trend.direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 rounded-full px-2 py-0.5">
        <TrendingDown size={12} /> {trend.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50 bg-ink/5 rounded-full px-2 py-0.5">
      <Minus size={12} /> {trend.label}
    </span>
  );
}

export default function TrendAnalysisPanel({ records = [] }) {
  const [granularity, setGranularity] = useState("monthly");

  const { series, undatedCount } = useMemo(() => buildResistanceTrends(records, { granularity }), [records, granularity]);
  const comparisons = useMemo(() => compareLatestPeriods(series), [series]);

  // Filtering on "has >=2 dated periods with data" is too weak for
  // multi-year datasets at monthly granularity — with enough calendar
  // spread, nearly every organism-antimicrobial pair trivially clears that
  // bar even with only 1-2 isolates per month, producing a huge list of
  // "Insufficient data (small n)" entries that add noise rather than
  // signal. The real filter should be whether classifyTrend() actually
  // found a meaningful pattern (Improving/Worsening/Stable, which already
  // requires >=5 isolates at both the first and last period compared) —
  // not just whether calendar time happened to pass.
  const seriesWithEnoughData = series.filter((s) => !s.trend.label.startsWith("Insufficient data"));
  const worsening = seriesWithEnoughData.filter((s) => s.trend.direction === "down");

  if (records.length === 0) {
    return (
      <div className="surface-card p-5">
        <p className="text-sm text-ink/60">Upload data to see resistance trends over time.</p>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={18} className="text-brand" />
        <h3 className="font-semibold text-ink">Resistance trends over time</h3>
      </div>
      <p className="text-sm text-ink/60 mb-3">
        Tracks how susceptibility for each organism-antimicrobial pair drifts across the periods in your uploaded
        data — a phenotypic resistance trend, the same signal ARMOR and WHO GLASS report year over year.
      </p>

      <div className="rounded-xl border border-brand/15 bg-brand/6 p-3 mb-4 flex items-start gap-2 text-xs text-ink/60">
        <Info size={14} className="text-brand mt-0.5 shrink-0" />
        <span>
          This tracks lab-reported susceptibility results over time, not genomic mutations — no sequencing data
          exists in this pipeline. Trend directions require at least two periods with 5+ isolates each; smaller
          samples are marked "insufficient data" rather than implying a false trend.
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGranularity(g.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === g.id ? "bg-brand/12 text-brand" : "text-ink/50 hover:text-ink/70 hover:bg-ink/5"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {undatedCount > 0 && (
        <p className="text-xs text-warn mb-3">
          {undatedCount} record(s) have missing or unparseable episode dates and are excluded from trend analysis.
        </p>
      )}

      {worsening.length > 0 && (
        <div className="rounded-xl border border-danger/25 bg-danger/8 p-3 mb-4">
          <p className="text-sm font-medium text-danger mb-1">Worsening resistance detected</p>
          <ul className="text-xs text-ink/70 space-y-0.5">
            {worsening.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.organism}</span> / {s.antimicrobial}: susceptibility fell{" "}
                {Math.abs(s.trend.delta)} points from {s.points[0].label} to {s.points[s.points.length - 1].label}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparisons.length > 0 && (
        <details className="mb-4 text-xs">
          <summary className="cursor-pointer text-ink/50 hover:text-ink/70 font-medium">
            Latest period vs. previous period ({comparisons.length} pair{comparisons.length === 1 ? "" : "s"})
          </summary>
          <ul className="mt-2 space-y-1 text-ink/60">
            {comparisons.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-1 border-b border-ink/5 last:border-0">
                <span>
                  {c.organism} / {c.antimicrobial}
                </span>
                <span className={c.delta > 0 ? "text-success" : c.delta < 0 ? "text-danger" : "text-ink/45"}>
                  {c.prevPeriod.label} {c.prevPeriod.pctSusceptible}% → {c.currPeriod.label} {c.currPeriod.pctSusceptible}%
                  {c.delta !== 0 && ` (${c.delta > 0 ? "+" : ""}${c.delta})`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {seriesWithEnoughData.length === 0 ? (
        <p className="text-sm text-ink/45 py-4 text-center">
          Not enough data across multiple {granularity} periods yet to show trends — try a coarser granularity
          (e.g. yearly) or upload data spanning a longer time range.
        </p>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {seriesWithEnoughData.map((s, i) => (
            <div key={i} className="rounded-xl border border-ink/10 p-3.5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-ink text-sm">{s.organism}</p>
                  <p className="text-xs text-ink/50">{s.antimicrobial}</p>
                </div>
                <TrendBadge trend={s.trend} />
              </div>
              <div className="flex items-center gap-4">
                <Sparkline points={s.points} />
                <div className="text-xs text-ink/60 space-y-0.5">
                  {s.points.map((p, pi) => (
                    <div key={pi} className="flex items-center gap-2">
                      <span className="text-ink/40 w-16 shrink-0">{p.label}</span>
                      <span className={p.pctSusceptible >= 80 ? "text-success" : p.pctSusceptible >= 50 ? "text-warn" : "text-danger"}>
                        {p.pctSusceptible}% S
                      </span>
                      <span className="text-ink/35">(n={p.n})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
