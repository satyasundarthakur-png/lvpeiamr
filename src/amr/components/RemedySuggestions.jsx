import React from "react";
import { Stethoscope } from "lucide-react";

export default function RemedySuggestions({ remedies }) {
  if (!remedies || remedies.length === 0) {
    return (
      <p className="text-sm text-ink/55">
        Upload data with susceptibility results to see remedy suggestions.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {remedies.map((r, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 rounded-lg border border-amber/25 bg-amber/8 p-3 text-sm"
        >
          <Stethoscope size={15} className="mt-0.5 shrink-0 text-warn" />
          <span className="leading-relaxed text-ink/80">{r.message}</span>
        </li>
      ))}
    </ul>
  );
}
