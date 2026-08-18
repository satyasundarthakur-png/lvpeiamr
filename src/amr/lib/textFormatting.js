// Shared text-handling helpers for report export (docx + PDF).
//
// Two real problems these solve:
//
// 1. AI-generated narrative/trends text often contains markdown bold
//    (**like this**) and Unicode punctuation (em dashes, smart quotes, the
//    Greek letter β, ≥/≤, bullets, non-breaking spaces) that the LLM
//    produces naturally. Word (docx) renders Unicode fine, but jsPDF's
//    built-in fonts (helvetica/times/courier) only support the narrow
//    WinAnsi/Latin-1 character set — anything outside it renders as a
//    corrupted glyph and can shift/mangle adjacent characters (this is what
//    turned "β-lactam" into "²lactam" and "n = 1" into "n /= /1" in a real
//    exported report). Rather than embedding a custom Unicode font (a much
//    heavier dependency), we sanitize to safe ASCII equivalents for the PDF
//    path specifically, since correctness there matters more than perfect
//    typography fidelity.
// 2. Raw "**bold**" markers should never reach the final document as literal
//    asterisks — they need to become actual bold text runs.

const UNICODE_TO_ASCII = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"], // smart single quotes
  [/[\u201C\u201D\u201E\u201F]/g, '"'], // smart double quotes
  [/[\u2013\u2014]/g, "-"], // en/em dash
  [/\u2026/g, "..."], // ellipsis
  [/\u2022/g, "-"], // bullet
  [/\u00A0/g, " "], // non-breaking space
  [/\u2265/g, ">="], // ≥
  [/\u2264/g, "<="], // ≤
  [/\u00B1/g, "+/-"], // ±
  [/\u03B2/g, "beta"], // β
  [/\u03B1/g, "alpha"], // α
  [/\u03B3/g, "gamma"], // γ
  [/\u00B0/g, " degrees"], // °
  [/\u00B5/g, "u"], // µ (micro sign)
  [/\u2192/g, "->"], // →
];

// Sanitizes text for jsPDF's default fonts. Any remaining character outside
// printable ASCII + basic Latin-1 punctuation is stripped rather than left
// to render as a corrupted glyph — a missing character is far less
// confusing to a reader than a garbled one.
export function sanitizeForPdf(text) {
  if (!text) return text;
  let out = String(text);
  for (const [pattern, replacement] of UNICODE_TO_ASCII) {
    out = out.replace(pattern, replacement);
  }
  // Strip anything still outside safe WinAnsi-ish range.
  out = out.replace(/[^\x20-\x7E\n]/g, "");
  return out;
}

// Parses a line of text containing **bold** markers into an array of
// { text, bold } segments, so callers can render each segment with the
// correct font weight instead of leaving literal asterisks in the output.
export function parseBoldSegments(line) {
  const segments = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false });
  }
  return segments.length > 0 ? segments : [{ text: line, bold: false }];
}

// Strips markdown bold markers entirely, leaving plain text — used where a
// single plain string is needed (e.g. width-measurement before wrapping).
export function stripBoldMarkers(text) {
  return String(text || "").replace(/\*\*(.+?)\*\*/g, "$1");
}
