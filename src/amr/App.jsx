import React, { useMemo, useState } from "react";
import { Activity, Eye, Trash2, ShieldPlus, FlaskConical, Microscope, Sparkles, Globe2, BookMarked } from "lucide-react";
import FileUpload from "./components/FileUpload.jsx";
import SummaryStats from "./components/SummaryStats.jsx";
import AntibiogramTable from "./components/AntibiogramTable.jsx";
import FlaggedPatterns from "./components/FlaggedPatterns.jsx";
import RemedySuggestions from "./components/RemedySuggestions.jsx";
import PolicyNarrative from "./components/PolicyNarrative.jsx";
import TrendsInsightPanel from "./components/TrendsInsightPanel.jsx";
import MicrobiologyGlossary from "./components/MicrobiologyGlossary.jsx";
import ExportButtons from "./components/ExportButtons.jsx";
import { standardizeDataset, buildAntibiogram, flagPatterns, suggestRemedies } from "./lib/analyze.js";
import { extractRecordsFromNotes } from "./lib/groqClient.js";

function SectionHeading({ icon: Icon, title, tone = "brand", children }) {
  const toneClass = {
    brand: "text-brand bg-brand/10",
    violet: "text-violet bg-violet/10",
    coral: "text-coral bg-coral/10",
    amber: "text-warn bg-amber/15",
  }[tone];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={16} />
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [rawRows, setRawRows] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [trendsInsight, setTrendsInsight] = useState("");

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
    <div className="app-canvas min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink/8 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]">
              <Eye size={19} />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-ink">
                AMR <span className="text-gradient">Surveillance</span>
              </h1>
              <p className="text-xs text-ink/55">Ophthalmic infection &amp; antibiotic policy tracker</p>
            </div>
          </div>
          {rawRows.length > 0 && (
            <button
              onClick={clearData}
              className="flex items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/8 px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger/15"
            >
              <Trash2 size={15} /> Clear data
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="surface-card overflow-hidden">
          <div className="gradient-sunrise h-1.5 w-full" />
          <div className="p-6 sm:p-8">
            <div className="mb-6 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
                <Sparkles size={12} /> Local-first stewardship analytics
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Turn lab exports into an{" "}
                <span className="text-gradient">actionable antibiotic policy</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Drop in CSV, Excel, or Word case notes. Organism and drug names are standardized,
                antibiograms built, resistance patterns flagged, and a committee-ready report exported —
                all in your browser.
              </p>
            </div>
            <FileUpload
              onTabularParsed={handleTabularParsed}
              onDocumentParsed={handleDocumentParsed}
              apiKeySet={!!apiKey}
            />
            {docBusy && (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink/60">
                <Activity size={14} className="animate-pulse text-brand" /> Extracting structured records
                from document text via AI…
              </p>
            )}
            {docError && (
              <p className="mt-3 rounded-lg border border-danger/20 bg-danger/8 p-3 text-sm text-danger">
                {docError}
              </p>
            )}
          </div>
        </section>

        <section>
          <SectionHeading icon={BookMarked} title="Microbiology reference" tone="violet" />
          <MicrobiologyGlossary records={records} />
        </section>

        {records.length > 0 && (
          <>
            <section>
              <SectionHeading icon={Activity} title="Overview" tone="brand">
                <ExportButtons
                  antibiogram={antibiogram}
                  flags={flags}
                  remedies={remedies}
                  narrative={narrative}
                  trendsInsight={trendsInsight}
                  meta={{ recordCount: records.length }}
                />
              </SectionHeading>
              <SummaryStats records={records} />
            </section>

            <section>
              <SectionHeading icon={ShieldPlus} title="Flagged patterns" tone="coral" />
              <FlaggedPatterns flags={flags} />
            </section>

            <div className="grid gap-8 md:grid-cols-2">
              <section>
                <SectionHeading icon={Microscope} title="Antibiogram" tone="violet" />
                <AntibiogramTable records={records} antibiogram={antibiogram} />
              </section>

              <section>
                <SectionHeading icon={FlaskConical} title="Remedy suggestions" tone="amber" />
                <div className="surface-card p-5">
                  <RemedySuggestions remedies={remedies} />
                </div>
              </section>
            </div>

            <section>
              <SectionHeading icon={Sparkles} title="AI-generated summary" tone="brand" />
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

            <section>
              <SectionHeading icon={Globe2} title="Global trends & literature" tone="violet" />
              <TrendsInsightPanel
                records={records}
                antibiogram={antibiogram}
                flags={flags}
                meta={{ recordCount: records.length }}
                apiKey={apiKey}
                onInsightChange={setTrendsInsight}
              />
            </section>
          </>
        )}

        {records.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Microscope, tone: "brand", title: "Standardize", body: "Messy organism and drug spellings map to a reference taxonomy automatically." },
              { icon: ShieldPlus, tone: "coral", title: "Flag", body: "Discordant therapy, high-resistance pairs, and site clusters surface instantly." },
              { icon: Sparkles, tone: "violet", title: "Report", body: "Export a .docx or .pdf policy report with an optional AI-written summary." },
            ].map((card) => (
              <div key={card.title} className="surface-card lift-hover p-5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    card.tone === "brand"
                      ? "bg-brand/12 text-brand"
                      : card.tone === "coral"
                        ? "bg-coral/12 text-coral"
                        : "bg-violet/12 text-violet"
                  }`}
                >
                  <card.icon size={17} />
                </span>
                <p className="mt-3 font-semibold text-ink">{card.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">{card.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs leading-relaxed text-ink/45">
        All standardization and flagging rules run locally in your browser. Only the AI
        summary/document-extraction steps send data to Groq's API. No data is persisted unless you add
        storage.
      </footer>
    </div>
  );
}
