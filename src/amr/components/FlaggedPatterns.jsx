import React, { useState } from "react";
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function FlaggedPatterns({ flags }) {
  const [expanded, setExpanded] = useState({});

  if (!flags || flags.length === 0) {
    return (
      <p className="text-sm text-ink/60">No concerning patterns flagged in the current dataset.</p>
    );
  }

  return (
    <div className="space-y-3">
      {flags.map((flag, i) => {
        const isOpen = expanded[i];
        const Icon = flag.severity === "high" ? AlertTriangle : AlertCircle;
        const colorClasses = flag.severity === "high"
          ? "border-red-200 bg-danger/8"
          : "border-amber/35 bg-amber/10";
        const iconColor = flag.severity === "high" ? "text-danger" : "text-warn";

        return (
          <div key={i} className={`border rounded-lg p-4 ${colorClasses}`}>
            <button
              className="w-full flex items-start justify-between gap-3 text-left"
              onClick={() => setExpanded((e) => ({ ...e, [i]: !e[i] }))}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
                <div>
                  <p className="font-semibold text-ink">{flag.title}</p>
                  <p className="text-sm text-ink/70 mt-0.5">{flag.detail}</p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="shrink-0 mt-1 text-ink/45" /> : <ChevronDown size={16} className="shrink-0 mt-1 text-ink/45" />}
            </button>

            {isOpen && flag.records && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full overflow-hidden rounded-lg border border-ink/10 bg-background text-xs">
                  <thead className="bg-brand/6 text-ink/60 uppercase">
                    <tr>
                      <th className="text-left px-3 py-1.5">Patient</th>
                      <th className="text-left px-3 py-1.5">Site</th>
                      <th className="text-left px-3 py-1.5">Organism</th>
                      <th className="text-left px-3 py-1.5">Drug Given</th>
                      <th className="text-left px-3 py-1.5">R/S/I</th>
                      <th className="text-left px-3 py-1.5">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flag.records.slice(0, 25).map((r, idx) => (
                      <tr key={idx} className="border-t border-ink/8">
                        <td className="px-3 py-1.5">{r.patient_id || "—"}</td>
                        <td className="px-3 py-1.5">{r.infection_site || "—"}</td>
                        <td className="px-3 py-1.5">{r.organism_standardized || r.organism || "—"}</td>
                        <td className="px-3 py-1.5">{r.antimicrobial_standardized || r.antimicrobial || "—"}</td>
                        <td className="px-3 py-1.5">{r.rsi || "—"}</td>
                        <td className="px-3 py-1.5">{r.outcome || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {flag.records.length > 25 && (
                  <p className="text-xs text-ink/45 mt-1">Showing 25 of {flag.records.length} records.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
