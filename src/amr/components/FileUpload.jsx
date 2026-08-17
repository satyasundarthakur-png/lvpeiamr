import React, { useCallback, useState } from "react";
import { UploadCloud, FileSpreadsheet, FileText, AlertCircle } from "lucide-react";
import { parseUploadedFile } from "../lib/fileParsers.js";

export default function FileUpload({ onTabularParsed, onDocumentParsed, apiKeySet }) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'error'|'info', message }
  const [busy, setBusy] = useState(false);

  const handleFiles = useCallback(
    async (fileList) => {
      setStatus(null);
      setBusy(true);
      const files = Array.from(fileList);
      let allTabularRows = [];
      const docTexts = [];

      try {
        for (const file of files) {
          const parsed = await parseUploadedFile(file);
          if (parsed.type === "tabular") {
            if (parsed.rows.length === 0) {
              setStatus({ type: "error", message: `"${file.name}" had no usable rows. Check the header row matches expected columns.` });
              continue;
            }
            allTabularRows = allTabularRows.concat(parsed.rows);
          } else if (parsed.type === "document") {
            docTexts.push({ filename: file.name, rawText: parsed.rawText });
          }
        }

        if (allTabularRows.length > 0) {
          onTabularParsed(allTabularRows);
        }
        if (docTexts.length > 0) {
          if (!apiKeySet) {
            setStatus({
              type: "error",
              message: "DOCX files need an AI extraction step. Add a Groq API key in Settings first, then re-upload the .docx file.",
            });
          } else {
            onDocumentParsed(docTexts);
          }
        }
        if (allTabularRows.length === 0 && docTexts.length === 0) {
          setStatus({ type: "error", message: "No supported files found. Upload .csv, .xlsx, .xls, or .docx." });
        }
      } catch (err) {
        setStatus({ type: "error", message: err.message });
      } finally {
        setBusy(false);
      }
    },
    [onTabularParsed, onDocumentParsed, apiKeySet]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          dragOver ? "border-brand bg-brand/8 scale-[1.01]" : "border-ink/15 bg-background/70"
        }`}
      >
        <UploadCloud className="mx-auto mb-3 text-brand" size={36} />
        <p className="font-semibold text-ink">Drop infection surveillance files here</p>
        <p className="text-sm text-ink/60 mt-1">
          CSV, Excel (.xlsx/.xls), or Word (.docx) clinical notes
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-ink/45">
          <span className="flex items-center gap-1"><FileSpreadsheet size={14}/> csv / xlsx</span>
          <span className="flex items-center gap-1"><FileText size={14}/> docx</span>
        </div>
        <label className="inline-block mt-4 px-4 py-2 btn-brand text-sm rounded-xl cursor-pointer">
          {busy ? "Processing…" : "Choose files"}
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.docx"
            className="hidden"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            disabled={busy}
          />
        </label>
      </div>

      {status && (
        <div className={`mt-3 flex items-start gap-2 text-sm rounded-md p-3 ${
          status.type === "error" ? "border border-danger/20 bg-danger/8 text-danger" : "bg-brand/8 text-ink/80"
        }`}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      <details className="mt-4 text-xs text-ink/60">
        <summary className="cursor-pointer hover:text-ink/80">Expected CSV/Excel columns</summary>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 font-mono">
          <span>patient_id</span>
          <span>episode_date</span>
          <span>infection_site</span>
          <span>procedure_type</span>
          <span>organism</span>
          <span>antimicrobial_given</span>
          <span>route</span>
          <span>susceptibility_result</span>
          <span>outcome</span>
        </div>
        <p className="mt-2">Headers are matched flexibly (e.g. "Antibiotic Given", "Drug Used" both map to antimicrobial_given). Unmapped columns are kept as-is.</p>
      </details>
    </div>
  );
}
