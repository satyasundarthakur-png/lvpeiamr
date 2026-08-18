import React from "react";

export default function AntibiogramTable({ antibiogram }) {
  if (!antibiogram || antibiogram.length === 0) {
    return <p className="text-sm text-ink/60">No susceptibility data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto surface-card">
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
              <td className="px-4 py-2 font-semibold text-ink">{row.organism}</td>
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
      <p className="text-xs text-ink/45 px-4 py-2">* n &lt; 10 — interpret as preliminary, not statistically robust.</p>
    </div>
  );
}
