// Multi-provider AI client. Supports Groq (OpenAI-compatible chat completions)
// and Google Gemini (generateContent), so a rate limit or outage on one
// provider doesn't block every AI-assisted feature in the app — the person
// can switch providers from the same settings panel.
//
// NOTE: for a production deployment, proxy these calls through a
// server-side function (e.g. a Supabase Edge Function) so API keys are
// never exposed client-side. For quick prototyping, the direct calls below
// work if you accept the key being visible in the browser bundle.

export const PROVIDERS = {
  groq: {
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    keyPlaceholder: "gsk_...",
    keyHint: "Get a free key at console.groq.com",
  },
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    keyHint: "Get a free key at aistudio.google.com/apikey",
  },
};

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGroq({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim() || "";
  // A response cut off mid-sentence by the token budget is worse than an
  // obviously-truncated one — flag it visibly rather than silently handing
  // back a paragraph that just stops.
  if (choice?.finish_reason === "length") {
    return text + "\n\n[Response was cut off — the AI ran out of space before finishing. Try regenerating, or switch provider.]";
  }
  return text;
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  const url = `${GEMINI_ENDPOINT_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        // Gemini 2.5 Flash has "thinking" (extended internal reasoning)
        // enabled by DEFAULT, and thinking tokens are billed against and
        // counted toward the SAME maxOutputTokens budget as the visible
        // response — the model can silently burn 90%+ of the budget
        // reasoning before writing anything, producing a truncated or even
        // empty response no matter how high maxOutputTokens is set. These
        // are straightforward summarization/writing tasks that don't
        // benefit from extended reasoning, so thinking is disabled outright
        // rather than just working around it with a bigger budget.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text && candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was cut off (max output tokens reached) before producing any text. Try again.");
  }
  if (candidate?.finishReason === "MAX_TOKENS") {
    return text.trim() + "\n\n[Response was cut off — the AI ran out of space before finishing. Try regenerating, or switch provider.]";
  }
  return text.trim();
}

async function callChatCompletion({ provider, apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  if (!apiKey) {
    const label = PROVIDERS[provider]?.label || provider;
    throw new Error(`Missing ${label} API key. Add it in Settings before using this feature.`);
  }
  const resolvedModel = model || PROVIDERS[provider]?.defaultModel;
  if (provider === "gemini") {
    return callGemini({ apiKey, model: resolvedModel, systemPrompt, userPrompt, maxTokens, temperature });
  }
  return callGroq({ apiKey, model: resolvedModel, systemPrompt, userPrompt, maxTokens, temperature });
}

// Bounds how much raw data gets embedded in a prompt, regardless of dataset
// size. This matters for two reasons: (1) asking a model to exhaustively
// narrate every row of a 90+ entry antibiogram will never fit in any
// reasonable output budget, no matter how high maxTokens is set — output
// truncation scales with how much the model is asked to cover, not just the
// budget given; (2) a large unbounded prompt burns through provider rate
// limits fast (e.g. Groq's free-tier 8000 TPM is a combined input+output
// budget). Rather than send everything and hope, the most clinically
// significant rows are prioritized (highest resistance first, tie-broken by
// largest sample size) and the rest are summarized as a count.
function summarizeAntibiogramForPrompt(antibiogram, maxRows = 20) {
  if (antibiogram.length <= maxRows) {
    return { rows: antibiogram, omittedCount: 0, totalRows: antibiogram.length };
  }
  const sorted = [...antibiogram].sort((a, b) => b.pctResistant - a.pctResistant || b.n - a.n);
  return {
    rows: sorted.slice(0, maxRows),
    omittedCount: sorted.length - maxRows,
    totalRows: sorted.length,
  };
}

function summarizeFlagsForPrompt(flags, maxFlags = 10) {
  if (flags.length <= maxFlags) {
    return { flags, omittedCount: 0, totalFlags: flags.length };
  }
  const severityRank = { high: 0, medium: 1, low: 2 };
  const sorted = [...flags].sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3));
  return {
    flags: sorted.slice(0, maxFlags),
    omittedCount: sorted.length - maxFlags,
    totalFlags: sorted.length,
  };
}

function buildPolicyPrompt({ antibiogram, flags, remedies, meta }) {
  const abSummary = summarizeAntibiogramForPrompt(antibiogram, 20);
  const flagSummary = summarizeFlagsForPrompt(flags, 10);
  const scaleNote =
    abSummary.omittedCount > 0 || flagSummary.omittedCount > 0
      ? `\nNOTE: This dataset is large. You are shown the ${abSummary.rows.length} highest-resistance organism-antimicrobial pairs (of ${abSummary.totalRows} total) and the ${flagSummary.flags.length} highest-severity flags (of ${flagSummary.totalFlags} total) — do not claim the omitted pairs/flags don't exist or are lower-risk; instead, synthesize the OVERARCHING pattern(s) across the full dataset rather than trying to individually list every row. Refer to totals (e.g. "${flagSummary.totalFlags} flagged patterns across the dataset") rather than only the ones shown to you.\n`
      : "";

  return `You are an antimicrobial stewardship analyst reviewing ophthalmology infection surveillance data.

Facility context: ${meta?.facility || "Not specified"}
Records analyzed: ${meta?.recordCount ?? "unknown"}
Date range: ${meta?.dateRange || "not specified"}
${scaleNote}
ANTIBIOGRAM DATA (organism, antimicrobial, n tested, % susceptible, % resistant)${abSummary.omittedCount > 0 ? ` — top ${abSummary.rows.length} of ${abSummary.totalRows} pairs by resistance` : ""}:
${JSON.stringify(abSummary.rows, null, 2)}
${abSummary.omittedCount > 0 ? `\n(${abSummary.omittedCount} additional, generally lower-resistance organism-antimicrobial pairs not shown)\n` : ""}

FLAGGED PATTERNS${flagSummary.omittedCount > 0 ? ` — top ${flagSummary.flags.length} of ${flagSummary.totalFlags} by severity` : ""}:
${JSON.stringify(flagSummary.flags.map((f) => ({ title: f.title, detail: f.detail, severity: f.severity, count: f.records?.length })), null, 2)}
${flagSummary.omittedCount > 0 ? `\n(${flagSummary.omittedCount} additional flagged patterns not shown)\n` : ""}

RULE-BASED REMEDY SUGGESTIONS (top entries; treat as representative, not exhaustive, for large datasets):
${JSON.stringify(remedies.slice(0, 15), null, 2)}
${remedies.length > 15 ? `\n(${remedies.length - 15} additional remedy suggestions not shown)\n` : ""}

Write a concise antibiotic policy surveillance summary for an infection control / pharmacy stewardship committee. Include:
1. A 2-3 sentence executive summary of the key resistance/discordance findings — reference the TOTAL scale of the dataset (e.g. total flagged cases), not just what's shown to you.
2. The most urgent pattern(s) requiring action, with brief reasoning. For a large dataset, group by THEME (e.g. "multiple Gram-negative organisms showed >=30% resistance to commonly used fluoroquinolones") rather than listing every individual organism-drug pair.
3. Specific, actionable empiric antibiotic policy recommendations for ophthalmic infections (prophylaxis and treatment), grounded strictly in the data provided — do not invent statistics not present in the input.
4. Caveats about sample size where n is small (below 10) — flag these as preliminary, not definitive.

Keep it under 350 words, plain language suitable for a hospital committee, no markdown headers with #, use short paragraphs and a bullet list for recommendations. Prioritize covering the full scope of the findings over enumerating every row of data.`;
}

export async function generatePolicyNarrative({ provider = "groq", apiKey, model, antibiogram, flags, remedies, meta }) {
  const prompt = buildPolicyPrompt({ antibiogram, flags, remedies, meta });
  return callChatCompletion({
    provider,
    apiKey,
    model,
    systemPrompt:
      "You are a careful, evidence-grounded antimicrobial stewardship analyst. Never fabricate numbers not present in the input data.",
    userPrompt: prompt,
    maxTokens: 1400,
    temperature: 0.3,
  });
}

// Contextual "global trends" briefing: compares the user's own antibiogram
// against known, named surveillance programs/literature (passed in as
// grounding context so the model cites real sources instead of inventing
// statistics). This is a general-knowledge synthesis from the model, not a
// live database lookup — the UI must label it as such.
function buildTrendsPrompt({ antibiogram, flags, organismCodes, references, meta }) {
  const institutionalPrograms = references.programs.filter((p) => p.isInstitutional);
  const institutionalLiterature = references.literature.filter((l) => l.isInstitutional);
  const hasInstitutionalData = institutionalPrograms.length > 0 || institutionalLiterature.length > 0;
  const hasPeerData = references.programs.some((p) => p.peerInstitution) || references.literature.some((l) => l.peerInstitution);

  const abSummary = summarizeAntibiogramForPrompt(antibiogram, 20);
  const flagSummary = summarizeFlagsForPrompt(flags, 10);
  const scaleNote =
    abSummary.omittedCount > 0 || flagSummary.omittedCount > 0
      ? `\nNOTE: This dataset is large. You are shown the ${abSummary.rows.length} highest-resistance organism-antimicrobial pairs (of ${abSummary.totalRows} total) and the ${flagSummary.flags.length} highest-severity flags (of ${flagSummary.totalFlags} total) — synthesize overarching patterns rather than trying to individually cover every row, and refer to totals where relevant.\n`
      : "";

  return `You are an ocular-infection AMR (antimicrobial resistance) research analyst. You are given:
1) A local antibiogram from an ophthalmology unit.
2) A curated list of REAL, named surveillance programs and literature relevant to the organisms present (use ONLY these as your source references — do not invent other studies, statistics, or citations).
${hasInstitutionalData ? "3) Some references are the facility's OWN institute's previously published research (marked isInstitutional) — prioritize comparing the local data against these institutional benchmarks FIRST, since they reflect the same patient population, climate, and referral base." : ""}
${hasPeerData ? "4) Some references are published work from other major Indian tertiary eye institutes (marked with a peerInstitution name, e.g. Aravind Eye Hospital, Sankara Nethralaya, AIIMS RP Centre) — a useful SECOND tier of comparison after the facility's own data: same country, broadly similar patient population, but not the facility's own numbers. Note that regional variation within India can still be meaningful (e.g. published North vs Central India differences)." : ""}
${scaleNote}
Facility context: ${meta?.facility || "Not specified"}
Records analyzed: ${meta?.recordCount ?? "unknown"}

LOCAL ANTIBIOGRAM (organism, antimicrobial, n tested, % susceptible, % resistant)${abSummary.omittedCount > 0 ? ` — top ${abSummary.rows.length} of ${abSummary.totalRows} pairs by resistance` : ""}:
${JSON.stringify(abSummary.rows, null, 2)}
${abSummary.omittedCount > 0 ? `\n(${abSummary.omittedCount} additional, generally lower-resistance organism-antimicrobial pairs not shown)\n` : ""}

LOCAL FLAGGED PATTERNS${flagSummary.omittedCount > 0 ? ` — top ${flagSummary.flags.length} of ${flagSummary.totalFlags} by severity` : ""}:
${JSON.stringify(flagSummary.flags.map((f) => ({ title: f.title, detail: f.detail, severity: f.severity })), null, 2)}

ORGANISMS PRESENT IN THIS DATA: ${organismCodes.join(", ") || "none"}

REFERENCE SURVEILLANCE PROGRAMS (real, named — cite by name only, don't fabricate numbers from them unless given below):
${JSON.stringify(references.programs.map((p) => ({ name: p.name, scope: p.scope, summary: p.summary, isInstitutional: !!p.isInstitutional, peerInstitution: p.peerInstitution || null, headlineStats: p.headlineStats })), null, 2)}

REFERENCE LITERATURE (real, named):
${JSON.stringify(references.literature.map((l) => ({ title: l.title, note: l.note, isInstitutional: !!l.isInstitutional, peerInstitution: l.peerInstitution || null })), null, 2)}

Write a "Global Trends & Literature Context" briefing (400-450 words — this covers institutional, peer-institution, AND broader trends, so use the space; do not sacrifice completeness for brevity, plain language, no markdown headers with #) that:
1. ${hasInstitutionalData ? "FIRST, compares the LOCAL antibiogram numerically against any headlineStats given above from the facility's own institutional references (e.g. 'this facility's own network previously reported X% susceptibility to vancomycin; the current data shows Y%') — this institutional comparison is the most important and actionable part of the briefing." : "Notes which of the reference programs/papers above are most relevant to the organisms in THIS dataset."}
2. ${hasPeerData ? "SECOND, briefly notes how the local data compares to the peer Indian institution references, if their notes contain comparable figures — framed as a national comparison, not the facility's own history." : ""}
3. Then describes, in general terms drawn from your own medical knowledge and the broader (non-institutional, non-peer) references above, what trends are typically reported internationally for these organisms in ocular infections — clearly framed as general/published knowledge, not as a live statistic.
4. Says explicitly whether the LOCAL data appears broadly consistent with, or notably different from, the institutional benchmark, the peer-institution comparison, and the broader published trends — and flags this as worth deeper review if uncertain.
5. Ends with one sentence reminding the reader this is a general-knowledge synthesis, not a live database query, and that current primary literature/institutional data should be checked directly for up-to-date figures.
Do not state specific resistance percentages unless they appear in the LOCAL ANTIBIOGRAM DATA above or are explicitly given in the reference summaries/headlineStats.`;
}

export async function generateTrendsInsight({ provider = "groq", apiKey, model, antibiogram, flags, organismCodes, references, meta }) {
  const prompt = buildTrendsPrompt({ antibiogram, flags, organismCodes, references, meta });
  return callChatCompletion({
    provider,
    apiKey,
    model,
    systemPrompt:
      "You are a careful, evidence-grounded AMR research analyst. You only reference the named programs/papers given to you. You never invent statistics, studies, or citations. You clearly distinguish local data from general published knowledge.",
    userPrompt: prompt,
    maxTokens: 1200,
    temperature: 0.3,
  });
}

export async function extractRecordsFromNotes({ provider = "groq", apiKey, model, rawText }) {
  const prompt = `Extract structured infection-surveillance records from the following clinical notes text. Return ONLY a JSON array (no markdown, no commentary), where each item has exactly these fields:
patient_id, episode_date, infection_site, procedure_type, organism, antimicrobial_given, route, susceptibility_result, outcome.
Use "" for any field not mentioned. Do not invent data not present in the text.

TEXT:
"""
${rawText.slice(0, 12000)}
"""`;

  const text = await callChatCompletion({
    provider,
    apiKey,
    model,
    systemPrompt: "You extract structured clinical data as strict JSON only. No prose, no markdown fences.",
    userPrompt: prompt,
    maxTokens: 2000,
    temperature: 0,
  });

  const cleaned = (text || "[]").replace(/^```json\s*|```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse structured records from the document. Try a cleaner note format or use CSV/Excel upload instead.");
  }
}
