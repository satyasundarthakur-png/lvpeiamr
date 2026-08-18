// Standardized antimicrobial reference list, weighted toward ophthalmic use
// (topical, intravitreal, and systemic agents commonly used for ocular infection).
import { fuzzyBestMatch, matchesAsToken } from "../lib/fuzzyMatch.js";

export const ANTIMICROBIALS = [
  { code: "MFX", name: "Moxifloxacin", class: "Fluoroquinolone", route: "Topical/Systemic", synonyms: ["moxifloxacin", "moxi", "vigamox"] },
  { code: "GAT", name: "Gatifloxacin", class: "Fluoroquinolone", route: "Topical", synonyms: ["gatifloxacin", "gati"] },
  { code: "CIP", name: "Ciprofloxacin", class: "Fluoroquinolone", route: "Topical/Systemic", synonyms: ["ciprofloxacin", "cipro"] },
  { code: "OFX", name: "Ofloxacin", class: "Fluoroquinolone", route: "Topical", synonyms: ["ofloxacin"] },
  { code: "LVX", name: "Levofloxacin", class: "Fluoroquinolone", route: "Topical/Systemic", synonyms: ["levofloxacin", "levo"] },
  { code: "VAN", name: "Vancomycin", class: "Glycopeptide", route: "Intravitreal/Systemic", synonyms: ["vancomycin", "vanco"] },
  { code: "CFZ", name: "Cefazolin", class: "Cephalosporin (1st gen)", route: "Topical/Intravitreal", synonyms: ["cefazolin"] },
  { code: "CAZ", name: "Ceftazidime", class: "Cephalosporin (3rd gen)", route: "Intravitreal/Systemic", synonyms: ["ceftazidime"] },
  { code: "CRO", name: "Ceftriaxone", class: "Cephalosporin (3rd gen)", route: "Systemic", synonyms: ["ceftriaxone"] },
  { code: "AMK", name: "Amikacin", class: "Aminoglycoside", route: "Topical/Intravitreal", synonyms: ["amikacin"] },
  { code: "GEN", name: "Gentamicin", class: "Aminoglycoside", route: "Topical/Intravitreal", synonyms: ["gentamicin", "gentamycin"] },
  { code: "TOB", name: "Tobramycin", class: "Aminoglycoside", route: "Topical", synonyms: ["tobramycin", "tobrex"] },
  { code: "PEN", name: "Penicillin G", class: "Penicillin", route: "Systemic", synonyms: ["penicillin", "penicillin g"] },
  { code: "AMC", name: "Amoxicillin-clavulanate", class: "Beta-lactam/inhibitor", route: "Systemic", synonyms: ["amoxicillin clavulanate", "augmentin", "co-amoxiclav"] },
  { code: "AZM", name: "Azithromycin", class: "Macrolide", route: "Topical/Systemic", synonyms: ["azithromycin", "azithromycin ophthalmic", "azasite"] },
  { code: "ERY", name: "Erythromycin", class: "Macrolide", route: "Topical", synonyms: ["erythromycin"] },
  { code: "CHL", name: "Chloramphenicol", class: "Amphenicol", route: "Topical", synonyms: ["chloramphenicol"] },
  { code: "POL", name: "Polymyxin B", class: "Polymyxin", route: "Topical", synonyms: ["polymyxin b", "polymyxin"] },
  { code: "BAC", name: "Bacitracin", class: "Polypeptide", route: "Topical", synonyms: ["bacitracin"] },
  { code: "NAT", name: "Natamycin", class: "Antifungal (polyene)", route: "Topical", synonyms: ["natamycin"] },
  { code: "VOR", name: "Voriconazole", class: "Antifungal (azole)", route: "Topical/Intravitreal/Systemic", synonyms: ["voriconazole"] },
  { code: "AMB", name: "Amphotericin B", class: "Antifungal (polyene)", route: "Intravitreal/Systemic", synonyms: ["amphotericin b", "amphotericin"] },
  { code: "OTHER", name: "Other/unspecified antimicrobial", class: "Other", route: "Unknown", synonyms: [] },
];

function buildCandidates() {
  const candidates = [];
  for (const ab of ANTIMICROBIALS) {
    candidates.push({ value: ab.name.toLowerCase(), ref: ab });
    for (const s of ab.synonyms) candidates.push({ value: s, ref: ab });
  }
  return candidates;
}
const FUZZY_CANDIDATES = buildCandidates();

export function standardizeAntimicrobial(rawText) {
  if (!rawText) return ANTIMICROBIALS.find((a) => a.code === "OTHER");
  const t = rawText.trim().toLowerCase();
  for (const ab of ANTIMICROBIALS) {
    if (ab.name.toLowerCase() === t) return ab;
    if (ab.synonyms.some((s) => t === s || matchesAsToken(t, s))) return ab;
  }
  const fuzzy = fuzzyBestMatch(t, FUZZY_CANDIDATES);
  if (fuzzy) return { ...fuzzy, fuzzyMatched: true };
  return { code: "UNMAPPED", name: rawText.trim(), class: "Unknown", route: "Unknown", synonyms: [] };
}
