import React, { useMemo, useState } from "react";
import { Search, Bug, Pill, MapPinned, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { ORGANISMS } from "../data/organisms.js";
import { ANTIMICROBIALS } from "../data/antimicrobials.js";
import { INFECTION_SITES } from "../data/infectionSites.js";
import { getRecognitionAudit } from "../lib/analyze.js";

const TABS = [
  { id: "organisms", label: "Organisms", icon: Bug },
  { id: "antimicrobials", label: "Antimicrobials", icon: Pill },
  { id: "sites", label: "Infection sites", icon: MapPinned },
];

function GlossaryCard({ title, subtitle, note, chips }) {
  return (
    <div className="rounded-xl border border-ink/10 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-ink text-sm">{title}</p>
        {subtitle && (
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink/45 rounded-full bg-ink/5 px-2 py-0.5">
            {subtitle}
          </span>
        )}
      </div>
      {note && <p className="mt-1.5 text-xs text-ink/60 leading-relaxed">{note}</p>}
      {chips && chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={c} className="text-[11px] font-mono text-ink/50 bg-ink/5 rounded px-1.5 py-0.5">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MicrobiologyGlossary({ records = [] }) {
  const [tab, setTab] = useState("organisms");
  const [query, setQuery] = useState("");

  const audit = useMemo(() => getRecognitionAudit(records), [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (name, synonyms = []) =>
      !q || name.toLowerCase().includes(q) || synonyms.some((s) => s.includes(q));

    if (tab === "organisms") return ORGANISMS.filter((o) => o.code !== "OTHER" && matches(o.name, o.synonyms));
    if (tab === "antimicrobials") return ANTIMICROBIALS.filter((a) => a.code !== "OTHER" && matches(a.name, a.synonyms));
    return INFECTION_SITES.filter((s) => s.code !== "UNSPEC" && matches(s.name, s.synonyms));
  }, [tab, query]);

  const hasRecognitionIssues = audit.fuzzyMatches.length > 0 || audit.unmapped.length > 0;

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Bug size={18} className="text-brand" />
        <h3 className="font-semibold text-ink">Ophthalmic microbiology glossary</h3>
      </div>
      <p className="text-sm text-ink/60 mb-4">
        Reference taxonomy for ocular pathogens, antimicrobials, and infection sites — the same recognition
        rules used to standardize your uploaded data, browsable for quick lookup.
      </p>

      {records.length > 0 && (
        <div
          className={`rounded-xl border p-3 mb-4 text-xs leading-relaxed ${
            hasRecognitionIssues ? "border-warn/30 bg-amber/10 text-ink/70" : "border-brand/20 bg-brand/6 text-ink/60"
          }`}
        >
          {!hasRecognitionIssues && (
            <p className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-brand shrink-0" />
              Every organism, antimicrobial, and infection site in your uploaded data was recognized exactly.
            </p>
          )}
          {audit.fuzzyMatches.length > 0 && (
            <div className="mb-2">
              <p className="flex items-center gap-1.5 font-medium text-ink/70">
                <HelpCircle size={14} className="text-warn shrink-0" />
                Matched via fuzzy/typo correction — verify these are correct:
              </p>
              <ul className="mt-1 ml-5 list-disc space-y-0.5">
                {audit.fuzzyMatches.map((m, i) => (
                  <li key={i}>
                    <span className="font-mono">"{m.raw}"</span> ({m.field}) → resolved to{" "}
                    <span className="font-medium">{m.resolvedTo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {audit.unmapped.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 font-medium text-ink/70">
                <AlertTriangle size={14} className="text-danger shrink-0" />
                Not recognized — check spelling or add as a synonym:
              </p>
              <ul className="mt-1 ml-5 list-disc space-y-0.5">
                {audit.unmapped.map((m, i) => (
                  <li key={i}>
                    <span className="font-mono">"{m.raw}"</span> ({m.field})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand/12 text-brand" : "text-ink/50 hover:text-ink/70 hover:bg-ink/5"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}…`}
          className="w-full text-sm rounded-lg border border-ink/15 bg-background pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/45"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1">
        {filtered.length === 0 && <p className="text-sm text-ink/45 col-span-2 py-4 text-center">No matches.</p>}
        {tab === "organisms" &&
          filtered.map((o) => (
            <GlossaryCard key={o.code} title={o.name} subtitle={o.gramType} note={o.note} chips={o.synonyms} />
          ))}
        {tab === "antimicrobials" &&
          filtered.map((a) => (
            <GlossaryCard key={a.code} title={a.name} subtitle={a.class} note={`Typical route: ${a.route}`} chips={a.synonyms} />
          ))}
        {tab === "sites" &&
          filtered.map((s) => (
            <GlossaryCard key={s.code} title={s.name} subtitle={s.category} note={s.note} chips={s.synonyms} />
          ))}
      </div>
    </div>
  );
}
