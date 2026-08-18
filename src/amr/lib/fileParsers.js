import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { anonymizeDataset, redactFreeText } from "./anonymize.js";

// Expected logical columns (case-insensitive, flexible header matching).
// The app tries to auto-map uploaded headers to these fields.
export const EXPECTED_FIELDS = [
  "patient_id",
  "episode_date",
  "infection_site", // e.g. surgical site, corneal ulcer, endophthalmitis
  "procedure_type", // e.g. cataract surgery, keratoplasty, none
  "organism",
  "antimicrobial_given", // antibiotic used as empiric/prophylaxis/treatment
  "route", // topical / intravitreal / systemic
  "susceptibility_result", // R / S / I / resistant / sensitive text, if known
  "outcome", // e.g. resolved, treatment failure, reoperation
];

const HEADER_ALIASES = {
  patient_id: ["patient id", "patientid", "mrn", "uhid", "id", "hospital no", "registration no", "registration number"],
  episode_date: ["date", "episode date", "admission date", "culture date", "visit date"],
  infection_site: ["infection site", "site", "diagnosis", "site of infection", "ocular site"],
  procedure_type: ["procedure", "procedure type", "surgery", "surgery type", "ocular procedure"],
  organism: ["organism", "culture organism", "pathogen", "isolate"],
  antimicrobial_given: ["antibiotic", "antibiotic given", "antimicrobial", "drug used", "treatment"],
  route: ["route", "route of administration"],
  susceptibility_result: ["susceptibility", "result", "rsi", "sensitivity", "amr result"],
  outcome: ["outcome", "clinical outcome", "status"],
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/[_\-]+/g, " ");
}

function mapHeaders(rawHeaders) {
  const mapping = {};
  rawHeaders.forEach((raw, idx) => {
    const norm = normalizeHeader(raw);
    let matched = null;
    for (const field of EXPECTED_FIELDS) {
      if (norm === field.replace(/_/g, " ")) {
        matched = field;
        break;
      }
      const aliases = HEADER_ALIASES[field] || [];
      if (aliases.includes(norm)) {
        matched = field;
        break;
      }
    }
    mapping[idx] = matched || raw; // fall back to raw header if unmapped
  });
  return mapping;
}

function rowsFromArrayOfArrays(rows) {
  if (!rows.length) return [];
  const headers = rows[0];
  const mapping = mapHeaders(headers);
  return rows.slice(1)
    .filter((r) => r.some((cell) => cell !== "" && cell != null))
    .map((r) => {
      const obj = {};
      r.forEach((cell, idx) => {
        const key = mapping[idx];
        obj[key] = cell != null ? String(cell).trim() : "";
      });
      return obj;
    });
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          resolve(rowsFromArrayOfArrays(results.data));
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
      skipEmptyLines: true,
    });
  });
}

export async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: "" });
  return rowsFromArrayOfArrays(rows);
}

// DOCX files are treated as unstructured clinical notes. We extract raw text
// and return it for the AI layer to structure, rather than trying to force
// it into the tabular schema client-side.
export async function parseDocx(file) {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return { rawText: result.value, warnings: result.messages };
}

export async function parseUploadedFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const rows = await parseCSV(file);
    const { rows: anonRows, report } = await anonymizeDataset(rows);
    return { type: "tabular", rows: anonRows, anonymizationReport: report };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const rows = await parseExcel(file);
    const { rows: anonRows, report } = await anonymizeDataset(rows);
    return { type: "tabular", rows: anonRows, anonymizationReport: report };
  }
  if (name.endsWith(".docx")) {
    const { rawText, warnings } = await parseDocx(file);
    return { type: "document", rawText: redactFreeText(rawText), warnings };
  }
  throw new Error(`Unsupported file type: ${file.name}. Please upload .csv, .xlsx, .xls, or .docx`);
}
