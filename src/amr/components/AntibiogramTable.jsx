import React, { useState } from "react";
import { Info } from "lucide-react";
import { buildAntibiogram } from "../lib/analyze.js";

export default function AntibiogramTable({ records = [], antibiogram: precomputed }) {
  const [firstIsolateOnly, setFirstIsolateOnly] = useState(true);
  const [organismGrouping, setOrganismGrouping] = useState("standardized");

  const antibiogram =
    records.length > 0 ? buildAntibiogram(records, { firstIsolateOnly, organismGrouping }) : precomputed || [];

  if (!antibiogram || antibiogram.length === 0) {
    return <p className="text-sm text-ink/60">No susceptibility data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto surface-card">
      {records.length > 0 && (
        <div className="flex items-start gap-2 px-4 pt-3 pb-1 text-xs text-ink/55">
          <Info size={14} className="text-brand mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={firstIsolateOnly}
                  onChange={(e) => setFirstIsolateOnly(e.target.checked)}
                  className="accent-brand"
                />
                <span>
                  <span className="font-medium text-ink/70">First isolate per patient</span> (CLSI M39 method — recommended)
                </span>
              </label>
              <p className="mt-1 leading-relaxed">
                {firstIsolateOnly
                  ? "Only the first culture per patient per organism in this dataset counts toward the antibiogram, so a single re-cultured patient can't skew the resistance rate. This matches WHONET/CLSI M39 cumulative antibiogram methodology."
                  : "Showing every isolate, including repeat cultures from the same patient. Uncheck this comparison to see how duplicate isolates can distort susceptibility percentages."}
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="font-medium text-ink/70">Organism grouping:</span>
                <select
                  value={organismGrouping}
                  onChange={(e) => setOrganismGrouping(e.target.value)}
                  className="text-xs rounded-md border border-ink/15 bg-background px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand/45"
                >
                  <option value="standardized">Standardized (genus/species rollup)</option>
                  <option value="exact">Exact species as entered</option>
                </select>
              </label>
              <p className="mt-1 leading-relaxed">
                {organismGrouping === "standardized"
                  ? "Species-level entries (e.g. Fusarium solani) roll up into their standardized taxonomy group for a usable cumulative count, but any rolled-up variant names are shown alongside the group — nothing is silently overwritten."
                  : "No rollup — each exact organism name as entered in your data gets its own row, even if they'd otherwise be grouped under the same species/genus."}
              </p>
            </div>
          </div>
        </div>
      )}
      <table className="min-w-full text-sm">
        <thead className="bg-brand/6 text-ink/70 uppercase text-xs tracking-wide">
          <tr>
            <th className="text-left px-4 py-2">Organism</th>
            <th className="text-left px-4 py-2">Antimicrobial</th>
            <th className="text-right px-4 py-2">n tested</th>
            <th className="text-right px-4 py-2">% Susceptible</th>
            <th className="text-right px-4 py-2">% Resistant</th>
          </tr>
        </thead>
        <tbody>
          {antibiogram.map((row, i) => (
            <tr key={i} className="border-t border-ink/8 hover:bg-brand/6">
              <td className="px-4 py-2 font-semibold text-ink">
                {row.organism}
                {row.organismVariants && row.organismVariants.length > 0 && (
                  <span className="block font-normal text-[11px] text-ink/45 italic">
                    incl. {row.organismVariants.join(", ")}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-ink/70">{row.antimicrobial}</td>
              <td className="px-4 py-2 text-right text-ink/60">{row.n}{row.n < 10 && <span className="text-warn ml-1" title="Small sample size">*</span>}</td>
              <td className={`px-4 py-2 text-right font-medium ${row.pctSusceptible >= 80 ? "text-success" : row.pctSusceptible >= 50 ? "text-warn" : "text-danger"}`}>
                {row.pctSusceptible}%
              </td>
              <td className={`px-4 py-2 text-right font-medium ${row.pctResistant >= 30 ? "text-danger" : "text-ink/60"}`}>
                {row.pctResistant}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink/45 px-4 py-2">
        * n &lt; 10 — interpret as preliminary, not statistically robust. CLSI M39 additionally recommends at least
        30 isolates before treating a rate as a stable facility-wide estimate.
      </p>
    </div>
  );
}
