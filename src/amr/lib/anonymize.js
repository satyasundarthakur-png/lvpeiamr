// All anonymization happens in the browser before any record is displayed,
// exported, or sent to the AI. Raw names/contact details never leave this
// module once processed.

// Column headers (normalized) that are treated as direct identifiers and
// DROPPED entirely — never stored, never displayed, never exported.
const PII_COLUMN_PATTERNS = [
  /^(patient )?name$/,
  /^full name$/,
  /^first name$/,
  /^last name$/,
  /^guardian name$/,
  /^father'?s? name$/,
  /^mother'?s? name$/,
  /^(dob|date of birth)$/,
  /^(phone|mobile|contact( no)?|telephone)$/,
  /^e[- ]?mail$/,
  /^address$/,
  /^aadh?ar( no)?$/,
  /^insurance( no)?$/,
  /^ssn$/,
  /^next of kin$/,
];

// Column headers treated as an identifier that should be HASHED rather than
// dropped, so repeat episodes for the same patient can still be linked
// without exposing the original ID.
const IDENTIFIER_COLUMN_PATTERNS = [
  /^patient ?id$/,
  /^mrn$/,
  /^uhid$/,
  /^(hospital|registration) ?(no|number|id)$/,
  /^id$/,
];

function normalize(h) {
  return String(h || "").trim().toLowerCase().replace(/[_\-]+/g, " ");
}

export function classifyColumn(header) {
  const norm = normalize(header);
  if (PII_COLUMN_PATTERNS.some((p) => p.test(norm))) return "drop";
  if (IDENTIFIER_COLUMN_PATTERNS.some((p) => p.test(norm))) return "hash";
  return "keep";
}

// SHA-256 hash via Web Crypto API, salted per-session so the same raw ID
// always maps to the same pseudonym within a session (needed to track
// repeat episodes for one patient) but is not persisted or reversible.
export async function hashIdentifier(value, salt) {
  if (!value) return "";
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${String(value).trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `PT-${hex.slice(0, 10).toUpperCase()}`;
}

// Generates a fresh random salt. Kept in sessionStorage so it survives page
// reloads within the same browser tab/session but is cleared when the tab
// closes — hashes are not reproducible across sessions or devices by design.
export function getSessionSalt() {
  const key = "amr_session_salt";
  let salt = sessionStorage.getItem(key);
  if (!salt) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    salt = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(key, salt);
  }
  return salt;
}

// Anonymizes a parsed tabular dataset: drops direct-identifier columns,
// hashes ID-like columns, and returns the cleaned rows plus a report of
// what was removed (shown to the user for transparency).
export async function anonymizeDataset(rows) {
  if (!rows.length) return { rows: [], report: { dropped: [], hashed: [] } };

  const salt = getSessionSalt();
  const headers = Object.keys(rows[0]);
  const dropped = [];
  const hashed = [];

  const classification = {};
  headers.forEach((h) => {
    const cls = classifyColumn(h);
    classification[h] = cls;
    if (cls === "drop") dropped.push(h);
    if (cls === "hash") hashed.push(h);
  });

  const cleanedRows = await Promise.all(
    rows.map(async (row) => {
      const newRow = {};
      for (const [key, value] of Object.entries(row)) {
        const cls = classification[key];
        if (cls === "drop") continue; // strip entirely
        if (cls === "hash") {
          newRow.patient_id = await hashIdentifier(value, salt); // normalize to patient_id
          continue;
        }
        newRow[key] = value;
      }
      if (!("patient_id" in newRow)) newRow.patient_id = "";
      return newRow;
    })
  );

  return { rows: cleanedRows, report: { dropped, hashed } };
}

// Best-effort redaction of free-text clinical notes (DOCX) before the text
// is sent to the AI for structured extraction. Regex-based, not perfect —
// review extracted output before relying on it for real patient data.
export function redactFreeText(text) {
  if (!text) return text;
  let redacted = text;

  // Explicit "Name:" / "Patient:" / "Guardian:" label lines. Covers bare
  // labels ("Patient:", "Guardian:") as well as the "X Name:" forms, since
  // EMR notes commonly use the shorter label without "Name".
  redacted = redacted.replace(/\b(patient name|patient|guardian name|guardian|father'?s? name|mother'?s? name|next of kin|caregiver)\s*[:\-]\s*[^\n,]{2,60}/gi, "$1: [REDACTED]");
  redacted = redacted.replace(/\bname\s*[:\-]\s*[^\n,]{2,60}/gi, "Name: [REDACTED]");

  // Titles followed by capitalized name pairs (Mr./Mrs./Ms./Dr. John Smith)
  redacted = redacted.replace(/\b(Mr|Mrs|Ms|Dr|Master|Miss)\.?\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?/g, "$1. [REDACTED]");

  // Phone numbers (10+ digit sequences, with optional separators)
  redacted = redacted.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\d{10}\b/g, "[PHONE REDACTED]");

  // Email addresses
  redacted = redacted.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL REDACTED]");

  // Dates of birth / age labeled explicitly
  redacted = redacted.replace(/\b(dob|date of birth)\s*[:\-]\s*[^\n,]{2,20}/gi, "$1: [REDACTED]");

  // Aadhaar-style 12-digit IDs
  redacted = redacted.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[ID REDACTED]");

  return redacted;
}
