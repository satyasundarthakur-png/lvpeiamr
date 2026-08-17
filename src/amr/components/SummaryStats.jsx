import React from "react";

export default function SummaryStats({ records }) {
  const total = records.length;
  const discordant = records.filter((r) => r.concordance.startsWith("Discordant")).length;
  const concordantFail = records.filter((r) => r.concordance.startsWith("Concordant but")).length;
  const noOrganism = records.filter((r) => r.organism_code === "NOGROW").length;
  const unmapped = records.filter((r) => r.organism_code === "UNMAPPED" || r.antimicrobial_class === "Unknown").length;

  const stats = [
    { label: "Records analyzed", value: total, tone: "text-ink" },
    { label: "Discordant therapy", value: discordant, tone: discordant > 0 ? "text-danger" : "text-emerald-600" },
    { label: "Clinical failure despite susceptible", value: concordantFail, tone: concordantFail > 0 ? "text-warn" : "text-emerald-600" },
    { label: "No organism isolated", value: noOrganism, tone: "text-slate-500" },
    { label: "Unmapped terms (review naming)", value: unmapped, tone: unmapped > 0 ? "text-amber-600" : "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white">
          <p className={`text-2xl font-semibold ${s.tone}`}>{s.value}</p>
          <p className="text-xs text-slate-500 mt-1 leading-snug">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
