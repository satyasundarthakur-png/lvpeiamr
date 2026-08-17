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

// Optional: structure free-text DOCX clinical notes into the tabular schema via LLM.
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
