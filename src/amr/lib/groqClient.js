// Calls Groq's OpenAI-compatible chat completions endpoint directly from the browser.
// NOTE: for a production deployment, proxy this through a Supabase Edge Function
// so the Groq API key is never exposed client-side. A stub for that is in
// src/lib/groqClient.js -> callViaProxy(). For quick Lovable prototyping, the
// direct call below works if you accept the key being visible in the browser bundle.

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

function buildPrompt({ antibiogram, flags, remedies, meta }) {
  return `You are an antimicrobial stewardship analyst reviewing ophthalmology infection surveillance data.

Facility context: ${meta?.facility || "Not specified"}
Records analyzed: ${meta?.recordCount ?? "unknown"}
Date range: ${meta?.dateRange || "not specified"}

ANTIBIOGRAM DATA (organism, antimicrobial, n tested, % susceptible, % resistant):
${JSON.stringify(antibiogram, null, 2)}

FLAGGED PATTERNS:
${JSON.stringify(flags.map((f) => ({ title: f.title, detail: f.detail, severity: f.severity, count: f.records?.length })), null, 2)}

RULE-BASED REMEDY SUGGESTIONS:
${JSON.stringify(remedies, null, 2)}

Write a concise antibiotic policy surveillance summary for an infection control / pharmacy stewardship committee. Include:
1. A 2-3 sentence executive summary of the key resistance/discordance findings.
2. The most urgent pattern(s) requiring action, with brief reasoning.
3. Specific, actionable empiric antibiotic policy recommendations for ophthalmic infections (prophylaxis and treatment), grounded strictly in the data provided — do not invent statistics not present in the input.
4. Caveats about sample size where n is small (below 10) — flag these as preliminary, not definitive.

Keep it under 350 words, plain language suitable for a hospital committee, no markdown headers with #, use short paragraphs and a bullet list for recommendations.`;
}

export async function generatePolicyNarrative({ apiKey, antibiogram, flags, remedies, meta, model = DEFAULT_MODEL }) {
  if (!apiKey) {
    throw new Error("Missing Groq API key. Add it in Settings before generating an AI summary.");
  }
  const prompt = buildPrompt({ antibiogram, flags, remedies, meta });

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a careful, evidence-grounded antimicrobial stewardship analyst. Never fabricate numbers not present in the input data." },
        { role: "user", content: prompt },
      ],
      max_tokens: 900,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "No response generated.";
}

// Contextual "global trends" briefing: compares the user's own antibiogram
// against known, named surveillance programs/literature (passed in as
// grounding context so the model cites real sources instead of inventing
// statistics). This is a general-knowledge synthesis from the model, not a
// live database lookup — the UI must label it as such.
function buildTrendsPrompt({ antibiogram, flags, organismCodes, references, meta }) {
  return `You are an ocular-infection AMR (antimicrobial resistance) research analyst. You are given:
1) A local antibiogram from an ophthalmology unit.
2) A curated list of REAL, named surveillance programs and literature relevant to the organisms present (use ONLY these as your source references — do not invent other studies, statistics, or citations).

Facility context: ${meta?.facility || "Not specified"}
Records analyzed: ${meta?.recordCount ?? "unknown"}

LOCAL ANTIBIOGRAM (organism, antimicrobial, n tested, % susceptible, % resistant):
${JSON.stringify(antibiogram, null, 2)}

LOCAL FLAGGED PATTERNS:
${JSON.stringify(flags.map((f) => ({ title: f.title, detail: f.detail, severity: f.severity })), null, 2)}

ORGANISMS PRESENT IN THIS DATA: ${organismCodes.join(", ") || "none"}

REFERENCE SURVEILLANCE PROGRAMS (real, named — cite by name only, don't fabricate numbers from them unless given below):
${JSON.stringify(references.programs.map((p) => ({ name: p.name, scope: p.scope, summary: p.summary })), null, 2)}

REFERENCE LITERATURE (real, named):
${JSON.stringify(references.literature.map((l) => ({ title: l.title, note: l.note })), null, 2)}

Write a "Global Trends & Literature Context" briefing (under 300 words, plain language, no markdown headers with #) that:
1. Notes which of the reference programs/papers above are most relevant to the organisms in THIS dataset.
2. Describes, in general terms drawn from your own medical knowledge and the references above, what broader trends are typically reported for these organisms in ocular infections (e.g. rising methicillin resistance in staphylococci, generally preserved fluoroquinolone susceptibility in Pseudomonas, etc.) — clearly framed as general/published knowledge, not as a live statistic.
3. Says explicitly whether the LOCAL data appears broadly consistent with, or notably different from, those general published trends — and flags this as worth deeper literature review if uncertain.
4. Ends with one sentence reminding the reader this is a general-knowledge synthesis, not a live database query, and that current primary literature/GLASS/ARMOR reports should be checked directly for up-to-date figures.
Do not state specific resistance percentages unless they appear in the LOCAL ANTIBIOGRAM DATA above or are explicitly given in the reference summaries.`;
}

export async function generateTrendsInsight({ apiKey, antibiogram, flags, organismCodes, references, meta, model = DEFAULT_MODEL }) {
  if (!apiKey) {
    throw new Error("Missing Groq API key. Add it in Settings before generating trends insight.");
  }
  const prompt = buildTrendsPrompt({ antibiogram, flags, organismCodes, references, meta });

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a careful, evidence-grounded AMR research analyst. You only reference the named programs/papers given to you. You never invent statistics, studies, or citations. You clearly distinguish local data from general published knowledge.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "No response generated.";
}
export async function extractRecordsFromNotes({ apiKey, rawText, model = DEFAULT_MODEL }) {
  if (!apiKey) {
    throw new Error("Missing Groq API key. Add it in Settings before extracting from documents.");
  }

  const prompt = `Extract structured infection-surveillance records from the following clinical notes text. Return ONLY a JSON array (no markdown, no commentary), where each item has exactly these fields:
patient_id, episode_date, infection_site, procedure_type, organism, antimicrobial_given, route, susceptibility_result, outcome.
Use "" for any field not mentioned. Do not invent data not present in the text.

TEXT:
"""
${rawText.slice(0, 12000)}
"""`;

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You extract structured clinical data as strict JSON only. No prose, no markdown fences." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "[]";
  const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse structured records from the document. Try a cleaner note format or use CSV/Excel upload instead.");
  }
}
