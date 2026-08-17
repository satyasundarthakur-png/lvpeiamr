import React from "react";
import { Stethoscope } from "lucide-react";

export default function RemedySuggestions({ remedies }) {
  if (!remedies || remedies.length === 0) {
    return <p className="text-sm text-slate-500">Upload data with susceptibility results to see remedy suggestions.</p>;
  }

  return (
    <ul className="space-y-2">
      {remedies.map((r, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <Stethoscope size={15} className="text-accent mt-0.5 shrink-0" />
          <span className="text-slate-700">{r.message}</span>
        </li>
      ))}
    </ul>
  );
}
