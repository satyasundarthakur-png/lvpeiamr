import React from "react";

export default function AntibiogramTable({ antibiogram }) {
  if (!antibiogram || antibiogram.length === 0) {
    return <p className="text-sm text-slate-500">No susceptibility data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
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
            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-ink">{row.organism}</td>
              <td className="px-4 py-2 text-slate-600">{row.antimicrobial}</td>
              <td className="px-4 py-2 text-right text-slate-500">{row.n}{row.n < 10 && <span className="text-amber-600 ml-1" title="Small sample size">*</span>}</td>
              <td className={`px-4 py-2 text-right font-medium ${row.pctSusceptible >= 80 ? "text-emerald-600" : row.pctSusceptible >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {row.pctSusceptible}%
              </td>
              <td className={`px-4 py-2 text-right font-medium ${row.pctResistant >= 30 ? "text-red-600" : "text-slate-500"}`}>
                {row.pctResistant}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 px-4 py-2">* n &lt; 10 — interpret as preliminary, not statistically robust.</p>
    </div>
  );
}
