import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { exportDocx, exportPdf } from "../lib/exportReport.js";

export default function ExportButtons({ antibiogram, flags, remedies, narrative, meta }) {
  const [busy, setBusy] = useState(null); // 'docx' | 'pdf' | null

  const handleExport = async (format) => {
    setBusy(format);
    try {
      if (format === "docx") {
        await exportDocx({ antibiogram, flags, remedies, narrative, meta });
      } else {
        exportPdf({ antibiogram, flags, remedies, narrative, meta });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport("docx")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors"
      >
        {busy === "docx" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        Export .docx
      </button>
      <button
        onClick={() => handleExport("pdf")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors"
      >
        {busy === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        Export .pdf
      </button>
    </div>
  );
}
