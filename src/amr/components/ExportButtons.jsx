import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { exportDocx, exportPdf } from "../lib/exportReport.js";

export default function ExportButtons({ antibiogram, flags, remedies, narrative, trendsInsight, meta }) {
  const [busy, setBusy] = useState(null);

  const handleExport = async (format) => {
    setBusy(format);
    try {
      if (format === "docx") {
        await exportDocx({ antibiogram, flags, remedies, narrative, trendsInsight, meta });
      } else {
        exportPdf({ antibiogram, flags, remedies, narrative, trendsInsight, meta });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {[
        { id: "docx", label: "Export .docx" },
        { id: "pdf", label: "Export .pdf" },
      ].map((btn) => (
        <button
          key={btn.id}
          onClick={() => handleExport(btn.id)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/8 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/16 disabled:opacity-40"
        >
          {busy === btn.id ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          {btn.label}
        </button>
      ))}
    </div>
  );
}
