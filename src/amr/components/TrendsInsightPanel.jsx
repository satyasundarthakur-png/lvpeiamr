import React, { useMemo, useState } from "react";
import { Globe2, Loader2, ExternalLink, BookOpen, Sparkles, Info } from "lucide-react";
import { getRelevantReferences } from "../data/globalSurveillance.js";
import { generateTrendsInsight, PROVIDERS } from "../lib/aiClient.js";

function InstitutionBadge({ entry }) {
  if (entry.isInstitutional) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand/15 rounded-full px-1.5 py-0.5">
        LVPEI
      </span>
    );
  }
  if (entry.peerInstitution) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet bg-violet/12 rounded-full px-1.5 py-0.5">
        {entry.peerInstitution}
      </span>
    );
  }
  return null;
}

export default function TrendsInsightPanel({ records, antibiogram, flags, meta, provider, apiKey, onInsightChange }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const organismCodes = useMemo(
    () => Array.from(new Set(records.map((r) => r.organism_code).filter((c) => c && c !== "UNMAPPED" && c !== "OTHER"))),
    [records]
  );

  const references = useMemo(() => getRelevantReferences(organismCodes), [organismCodes]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateTrendsInsight({
        provider,
        apiKey,
        antibiogram,
        flags,
        organismCodes,
        references,
        meta,
      });
      setInsight(result);
      onInsightChange?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Globe2 size={18} className="text-brand" />
        <h3 className="font-semibold text-ink">Global resistance trends &amp; literature context</h3>
      </div>
      <p className="text-sm text-ink/60 mb-4">
        Real, named surveillance programs and ocular-microbiology literature relevant to the organisms in your
        data, plus an optional AI-generated briefing comparing your local antibiogram to published trends.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45 mb-2">Surveillance programs</p>
          <ul className="space-y-2">
            {references.programs.map((p) => (
              <li key={p.id} className={`text-sm rounded-lg border p-2.5 ${p.isInstitutional ? "border-brand/30 bg-brand/6" : p.peerInstitution ? "border-violet/25 bg-violet/5" : "border-ink/10"}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                  >
                    {p.name} <ExternalLink size={12} />
                  </a>
                  <InstitutionBadge entry={p} />
                </div>
                <p className="text-xs text-ink/50 mt-0.5">{p.scope}</p>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed">{p.summary}</p>
                {p.headlineStats && (
                  <dl className="mt-2 grid grid-cols-1 gap-0.5 text-xs">
                    {Object.entries(p.headlineStats).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-ink/50">{label}</dt>
                        <dd className="font-medium text-ink/70">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45 mb-2 flex items-center gap-1.5">
            <BookOpen size={13} /> Key literature
          </p>
          <ul className="space-y-2">
            {references.literature.map((l) => (
              <li key={l.id} className={`text-sm rounded-lg border p-2.5 ${l.isInstitutional ? "border-brand/30 bg-brand/6" : l.peerInstitution ? "border-violet/25 bg-violet/5" : "border-ink/10"}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                  >
                    {l.title} <ExternalLink size={12} />
                  </a>
                  <InstitutionBadge entry={l} />
                </div>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed">{l.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-brand/15 bg-brand/6 p-3 mb-4 flex items-start gap-2 text-xs text-ink/60">
        <Info size={14} className="text-brand mt-0.5 shrink-0" />
        <span>
          These references are a curated, hand-picked list, not a live database query. The AI briefing below
          synthesizes general published knowledge about these organisms — it does not fetch current statistics
          from the internet. Always verify against the primary source before using it for policy decisions.
        </span>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !apiKey || antibiogram.length === 0}
        className="flex items-center gap-2 px-4 py-2 btn-brand text-sm rounded-xl font-medium disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "Comparing to published trends…" : `Generate trends briefing (${PROVIDERS[provider]?.label || provider})`}
      </button>
      {!apiKey && (
        <p className="text-xs text-ink/45 mt-2">Add an API key in the AI summary section above to enable this.</p>
      )}

      {error && <p className="mt-3 text-sm text-danger bg-danger/8 rounded-md p-3">{error}</p>}

      {insight && (
        <>
          <div className="mt-4 p-4 border border-violet/25 bg-violet/8 rounded-md text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {insight}
          </div>
          <p className="mt-2 text-xs text-ink/45">
            Included automatically in the .docx/.pdf export from the Overview section above.
          </p>
        </>
      )}
    </div>
  );
}
