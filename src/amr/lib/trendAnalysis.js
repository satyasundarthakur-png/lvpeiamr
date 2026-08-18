// Temporal resistance trend analysis: weekly/monthly/yearly views of how
// susceptibility for each organism-antimicrobial pair drifts over the
// analyzed period.
//
// IMPORTANT SCOPE NOTE: this tracks PHENOTYPIC resistance drift (the
// susceptible/intermediate/resistant lab result over time) — it is NOT
// genomic mutation tracking. No sequencing data exists anywhere in this
// pipeline. Phenotypic drift is exactly what real surveillance programs
// (ARMOR, WHO GLASS) report as "resistance trends" year over year, and is
// the correct, evidence-grounded proxy clinicians actually use — but it
// should never be described to a user as tracking mutations.
import { getFirstIsolatePerPatient } from "./analyze.js";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Standard ISO 8601 week numbering (Monday-start weeks, week 1 contains the
// year's first Thursday). Verified against known reference dates.
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday (0) -> 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move to this week's Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function getPeriodKey(dateStr, granularity) {
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return null;
  const d = new Date(ts);
  if (granularity === "yearly") return String(d.getFullYear());
  if (granularity === "weekly") return isoWeekKey(d);
  // monthly (default)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// Human-friendly label for a period key, used in UI.
export function formatPeriodLabel(periodKey, granularity) {
  if (!periodKey) return "Undated";
  if (granularity === "yearly") return periodKey;
  if (granularity === "weekly") return periodKey; // "2026-W12" is already clear
  const [year, month] = periodKey.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

// Classifies the overall trend for a series of {period, n, pctSusceptible}
// points, comparing the earliest to the latest period with usable data.
// Deliberately conservative: requires at least 2 periods with data AND a
// minimum n in both endpoints before calling a direction, otherwise flags
// insufficient data rather than implying false confidence.
const MIN_N_FOR_TREND = 5;
const STABLE_BAND = 10; // percentage points — smaller swings are called "Stable"

export function classifyTrend(points) {
  const withData = points.filter((p) => p.n > 0);
  if (withData.length < 2) {
    return { label: "Insufficient data", delta: null, direction: "flat" };
  }
  const first = withData[0];
  const last = withData[withData.length - 1];
  if (Math.min(first.n, last.n) < MIN_N_FOR_TREND) {
    return { label: "Insufficient data (small n)", delta: last.pctSusceptible - first.pctSusceptible, direction: "flat" };
  }
  const delta = last.pctSusceptible - first.pctSusceptible;
  if (delta >= STABLE_BAND) return { label: "Improving (susceptibility rising)", delta, direction: "up" };
  if (delta <= -STABLE_BAND) return { label: "Worsening (resistance rising)", delta, direction: "down" };
  return { label: "Stable", delta, direction: "flat" };
}

// Builds one time series per organism-antimicrobial pair. Applies the same
// CLSI M39 first-isolate-per-patient rule as the cumulative antibiogram by
// default, for the same reason: a single re-cultured patient shouldn't be
// able to fabricate an apparent trend within one period.
export function buildResistanceTrends(records, { granularity = "monthly", firstIsolateOnly = true } = {}) {
  const source = firstIsolateOnly ? getFirstIsolatePerPatient(records) : records;
  const buckets = {};
  let undatedCount = 0;

  source.forEach((r) => {
    if (r.rsi === "Unknown" || r.organism_code === "NOGROW") return;
    const period = getPeriodKey(r.episode_date, granularity);
    if (!period) {
      undatedCount += 1;
      return;
    }
    const pairKey = `${r.organism_standardized}|||${r.antimicrobial_standardized}`;
    if (!buckets[pairKey]) buckets[pairKey] = {};
    if (!buckets[pairKey][period]) buckets[pairKey][period] = { S: 0, I: 0, R: 0, total: 0 };
    buckets[pairKey][period][r.rsi] += 1;
    buckets[pairKey][period].total += 1;
  });

  const series = Object.entries(buckets).map(([pairKey, periods]) => {
    const [organism, antimicrobial] = pairKey.split("|||");
    const sortedPeriodKeys = Object.keys(periods).sort();
    const points = sortedPeriodKeys.map((p) => ({
      period: p,
      label: formatPeriodLabel(p, granularity),
      n: periods[p].total,
      pctSusceptible: Math.round((periods[p].S / periods[p].total) * 100),
      pctResistant: Math.round((periods[p].R / periods[p].total) * 100),
    }));
    return { organism, antimicrobial, points, trend: classifyTrend(points) };
  });

  series.sort((a, b) => a.organism.localeCompare(b.organism) || a.antimicrobial.localeCompare(b.antimicrobial));
  return { series, undatedCount };
}

// Period-over-period comparison: for each pair, compares only the most
// recent two periods (rather than first-vs-last across the whole range) —
// useful for a "this month vs last month" style callout distinct from the
// overall trend direction.
export function compareLatestPeriods(series) {
  return series
    .map((s) => {
      const withData = s.points.filter((p) => p.n > 0);
      if (withData.length < 2) return null;
      const prev = withData[withData.length - 2];
      const curr = withData[withData.length - 1];
      return {
        organism: s.organism,
        antimicrobial: s.antimicrobial,
        prevPeriod: prev,
        currPeriod: curr,
        delta: curr.pctSusceptible - prev.pctSusceptible,
      };
    })
    .filter(Boolean);
}
