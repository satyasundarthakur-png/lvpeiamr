import React, { useRef, useState } from "react";
import { FileDown, Loader2, Settings, Image as ImageIcon, X } from "lucide-react";
import { exportDocx, exportPdf } from "../lib/exportReport.js";

const MAX_LOGO_BYTES = 500 * 1024; // 500KB — plenty for a report letterhead logo

export default function ExportButtons({ antibiogram, flags, remedies, narrative, trendsInsight, trendSeries, meta }) {
  const [busy, setBusy] = useState(null);
  const [showBranding, setShowBranding] = useState(false);
  const [instituteName, setInstituteName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [logoError, setLogoError] = useState(null);
  const fileInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file (PNG or JPG).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo is too large — please use an image under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.onerror = () => setLogoError("Could not read that image — try a different file.");
    reader.readAsDataURL(file);
  };

  const branding = { instituteName, logoDataUrl };

  const handleExport = async (format) => {
    setBusy(format);
    try {
      if (format === "docx") {
        await exportDocx({ antibiogram, flags, remedies, narrative, trendsInsight, trendSeries, meta, branding });
      } else {
        exportPdf({ antibiogram, flags, remedies, narrative, trendsInsight, trendSeries, meta, branding });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowBranding((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5"
          title="Report letterhead (institute name & logo)"
        >
          <Settings size={13} />
          Letterhead
        </button>
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
            {busy === btn.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {btn.label}
          </button>
        ))}
      </div>

      {showBranding && (
        <div className="w-full max-w-sm rounded-xl border border-ink/12 bg-background p-3 text-left shadow-sm">
          <label className="block text-xs font-semibold text-ink/70 mb-1">Institute name (optional)</label>
          <input
            type="text"
            value={instituteName}
            onChange={(e) => setInstituteName(e.target.value)}
            placeholder="e.g. L V Prasad Eye Institute, KAR Campus"
            className="w-full text-sm rounded-lg border border-ink/15 bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/45"
          />

          <label className="block text-xs font-semibold text-ink/70 mt-3 mb-1">Logo (optional)</label>
          {logoDataUrl ? (
            <div className="flex items-center gap-2">
              <img src={logoDataUrl} alt="Report logo preview" className="h-10 w-10 rounded-md object-contain border border-ink/10 bg-white" />
              <button
                onClick={() => {
                  setLogoDataUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex items-center gap-1 text-xs text-danger hover:underline"
              >
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink/20 px-3 py-2 text-xs text-ink/50 hover:border-brand/40 hover:text-brand w-full justify-center"
            >
              <ImageIcon size={13} /> Upload logo (PNG/JPG, under 500KB)
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
          {logoError && <p className="text-xs text-danger mt-1">{logoError}</p>}

          <p className="text-[11px] text-ink/40 mt-2 leading-relaxed">
            Used only for this export — not saved between sessions. Appears in the report header alongside the
            standard title; AI-assisted sections remain labeled for transparency regardless of letterhead.
          </p>
        </div>
      )}
    </div>
  );
}
