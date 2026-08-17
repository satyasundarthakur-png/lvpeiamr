import React, { useMemo, useState } from "react";
import { Activity, Eye, Trash2 } from "lucide-react";
import FileUpload from "./components/FileUpload.jsx";
import SummaryStats from "./components/SummaryStats.jsx";
import AntibiogramTable from "./components/AntibiogramTable.jsx";
import FlaggedPatterns from "./components/FlaggedPatterns.jsx";
import RemedySuggestions from "./components/RemedySuggestions.jsx";
import PolicyNarrative from "./components/PolicyNarrative.jsx";
import ExportButtons from "./components/ExportButtons.jsx";
import { standardizeDataset, buildAntibiogram, flagPatterns, suggestRemedies } from "./lib/analyze.js";
import { extractRecordsFromNotes } from "./lib/groqClient.js";

export default function App() {
  const [rawRows, setRawRows] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState(null);
  const [narrative, setNarrative] = useState("");

  const records = useMemo(() => standardizeDataset(rawRows), [rawRows]);
  const antibiogram = useMemo(() => buildAntibiogram(records), [records]);
  const flags = useMemo(() => flagPatterns(records), [records]);
  const remedies = useMemo(() => suggestRemedies(records), [records]);

  const handleTabularParsed = (rows) => {
    setRawRows((prev) => [...prev, ...rows]);
  };

  const handleDocumentParsed = async (docTexts) => {
    setDocBusy(true);
    setDocError(null);
    try {
      const allExtracted = [];
      for (const doc of docTexts) {
        const extracted = await extractRecordsFromNotes({ apiKey, rawText: doc.rawText });
        allExtracted.push(...extracted);
      }
      setRawRows((prev) => [...prev, ...allExtracted]);
    } catch (err) {
      setDocError(err.message);
    } finally {
      setDocBusy(false);
    }
  };

  const clearData = () => {
    setRawRows([]);
    setDocError(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
              <Eye size={18} className="text-brand" />
            </div>
            <div>
              <h1 className="font-semibold text-ink text-lg leading-tight">AMR Surveillance</h1>
              <p className="text-xs text-slate-500">Ophthalmic infection & antibiotic policy tracker</p>
            </div>
          </div>
          {rawRows.length > 0 && (
            <button
              onClick={clearData}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-danger transition-colors"
            >
              <Trash2 size={15} /> Clear data
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <FileUpload
            onTabularParsed={handleTabularParsed}
            onDocumentParsed={handleDocumentParsed}
            apiKeySet={!!apiKey}
          />
          {docBusy && (
            <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
              <Activity size={14} className="animate-pulse text-brand" /> Extracting structured records from document text via AI…
            </p>
          )}
          {docError && (
            <p className="mt-3 text-sm text-danger bg-red-50 rounded-md p-3">{docError}</p>
          )}
        </section>

        {records.length > 0 && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Overview</h2>
                <ExportButtons
                  antibiogram={antibiogram}
                  flags={flags}
                  remedies={remedies}
                  narrative={narrative}
                  meta={{ recordCount: records.length }}
                />
              </div>
              <SummaryStats records={records} />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Flagged patterns</h2>
              <FlaggedPatterns flags={flags} />
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Antibiogram</h2>
                <AntibiogramTable antibiogram={antibiogram} />
              </section>

              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Rule-based remedy suggestions</h2>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <RemedySuggestions remedies={remedies} />
                </div>
              </section>
            </div>

            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">AI-generated summary</h2>
              <PolicyNarrative
                antibiogram={antibiogram}
                flags={flags}
                remedies={remedies}
                meta={{ recordCount: records.length }}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onNarrativeChange={setNarrative}
              />
            </section>
          </>
        )}

        {records.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">
            Upload a CSV, Excel, or Word file to begin analysis.
          </p>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-400">
        All standardization and flagging rules run locally in your browser. Only the AI summary/document-extraction steps send data to Groq's API. No data is persisted unless you add storage.
      </footer>
    </div>
  );
}
