// Curated reference list of established antibiotic COMBINATION regimens used
// in ophthalmic infection management — either for pharmacological synergy
// (mechanistically enhanced killing when used together) or for empiric dual
// coverage (broad-spectrum Gram-positive + Gram-negative cover while awaiting
// culture results). Each entry is grounded in named clinical literature/
// guidelines, not invented — see the `source` field on each entry.
//
// This is a static, hand-verified reference, not a live drug-interaction
// database or a substitute for local antibiogram-guided or pharmacist-
// reviewed dosing. Concentrations and regimens vary by formulation and
// institution; always confirm against current local protocol.
import { fuzzyBestMatch } from "../lib/fuzzyMatch.js";

export const COMBINATION_REGIMENS = [
  {
    id: "fortified-cefazolin-tobramycin",
    name: "Fortified Cefazolin + Fortified Tobramycin (or Gentamicin)",
    drugs: ["Cefazolin", "Tobramycin"],
    drugCodesHint: ["CFZ", "TOB", "GEN"],
    indication: "Empiric bacterial keratitis (severe/central ulcers, organism unknown)",
    mechanism:
      "Dual broad-spectrum coverage rather than a single pharmacological synergy target: cefazolin (cell-wall active) covers Gram-positive organisms including many staphylococci/streptococci, while tobramycin (aminoglycoside, protein synthesis inhibitor) covers Gram-negatives including Pseudomonas. Historically the traditional first-line regimen for severe bacterial keratitis, alternated hourly.",
    caveat:
      "Fortified formulations are compounded (not commercially standard strength) and can be corneal-epithelial toxic with prolonged use — taper once improving. Fourth-generation fluoroquinolone monotherapy is increasingly used for smaller/less severe ulcers with comparable efficacy in trials, though fortified dual therapy remains standard for severe/vision-threatening cases.",
    source: "Bacterial Keratitis Study Research Group (Arch Ophthalmol 1995); Medscape Bacterial Keratitis management guideline",
  },
  {
    id: "fortified-vancomycin-tobramycin",
    name: "Fortified Vancomycin + Fortified Tobramycin (or Gentamicin)",
    drugs: ["Vancomycin", "Tobramycin"],
    drugCodesHint: ["VAN", "TOB", "GEN"],
    indication: "Empiric bacterial keratitis, especially where MRSA/resistant Gram-positive organisms are a concern",
    mechanism:
      "Same dual Gram-positive/Gram-negative coverage logic as cefazolin+tobramycin, substituting vancomycin (glycopeptide) for cefazolin when methicillin-resistant staphylococci are suspected or locally prevalent.",
    caveat:
      "Reserve for settings/patients where MRSA risk is elevated rather than as universal first choice, to limit unnecessary vancomycin exposure and resistance pressure.",
    source: "Medscape Bacterial Keratitis management guideline",
  },
  {
    id: "intravitreal-vancomycin-ceftazidime",
    name: "Intravitreal Vancomycin + Ceftazidime",
    drugs: ["Vancomycin", "Ceftazidime"],
    drugCodesHint: ["VAN", "CAZ"],
    indication: "Empiric postoperative/post-injection endophthalmitis (given before or without culture results)",
    mechanism:
      "The Endophthalmitis Vitrectomy Study (EVS) regimen: vancomycin for Gram-positive cocci (which dominate postoperative endophthalmitis, especially coagulase-negative staphylococci) plus ceftazidime for Gram-negative bacillary coverage. This remains the standard empiric intravitreal combination in US/European guidelines.",
    caveat:
      "Vancomycin carries a rare but serious risk of hemorrhagic occlusive retinal vasculitis (HORV). Some regions report lower local susceptibility to this combination than Western cohorts — confirm against your own antibiogram where possible, and do not delay empiric treatment awaiting cultures.",
    source: "Endophthalmitis Vitrectomy Study (EVS), 1995; AAO clinical guidance on managing endophthalmitis",
  },
  {
    id: "intravitreal-triple-therapy",
    name: "Intravitreal Vancomycin + Ceftazidime + Moxifloxacin (triple therapy)",
    drugs: ["Vancomycin", "Ceftazidime", "Moxifloxacin"],
    drugCodesHint: ["VAN", "CAZ", "MFX"],
    indication: "Endophthalmitis with concern for resistant or atypical organisms, or in settings with reduced susceptibility to standard dual therapy",
    mechanism:
      "Adds a fluoroquinolone to the standard vancomycin/ceftazidime regimen for expanded Gram-negative coverage and potential synergy, particularly relevant where local antibiograms show reduced ceftazidime susceptibility.",
    caveat:
      "Reported as well-tolerated in retrospective series, but this is a resistance-driven escalation, not a universal first-line recommendation — reserve for settings where the local antibiogram or clinical picture supports it.",
    source: "Intravitreal triple therapy for bacterial endophthalmitis — 12-year retrospective series (Graefe's Arch Clin Exp Ophthalmol, 2023)",
  },
  {
    id: "beta-lactam-aminoglycoside-synergy",
    name: "Beta-lactam + Aminoglycoside (general synergy principle)",
    drugs: ["Cefazolin/Ceftazidime/Ampicillin", "Tobramycin/Gentamicin/Amikacin"],
    drugCodesHint: ["CFZ", "CAZ", "TOB", "GEN", "AMK"],
    indication: "General Gram-positive (esp. streptococci/enterococci) and Gram-negative synergy principle, applied throughout ophthalmic empiric regimens above",
    mechanism:
      "Classic, well-established pharmacological synergy: beta-lactams damage/permeabilize the bacterial cell wall, improving aminoglycoside penetration into the cell where it disrupts protein synthesis — the combination often achieves bactericidal killing neither agent reliably achieves alone against streptococci/enterococci.",
    caveat:
      "This is a general microbiology principle underlying several of the specific regimens above, not a standalone prescription — apply via the specific ocular regimens listed, not empirically compounded on its own.",
    source: "Classical antimicrobial pharmacology (beta-lactam/aminoglycoside synergy is textbook-established, e.g. in enterococcal endocarditis regimens) — see also EVS discussion of amikacin vs ceftazidime synergy with vancomycin",
  },
  {
    id: "trimethoprim-polymyxinb",
    name: "Trimethoprim + Polymyxin B",
    drugs: ["Trimethoprim", "Polymyxin B"],
    drugCodesHint: ["POL"],
    indication: "Bacterial conjunctivitis (broad-spectrum topical combination drop)",
    mechanism:
      "Trimethoprim (folate synthesis inhibitor, Gram-positive leaning coverage) combined with polymyxin B (cell-membrane-disrupting, Gram-negative leaning coverage including Pseudomonas) gives broad empiric coverage in a single formulated drop, commonly used for uncomplicated bacterial conjunctivitis.",
    caveat:
      "Appropriate for surface infection (conjunctivitis), not a substitute for fortified or intravitreal therapy in keratitis or endophthalmitis.",
    source: "Standard ophthalmic pharmacology reference for combination topical antibacterial drops (e.g. trimethoprim/polymyxin B formulations)",
  },
  {
    id: "voriconazole-natamycin-fungal",
    name: "Topical Natamycin + Voriconazole (or intrastromal/intracameral Voriconazole)",
    drugs: ["Natamycin", "Voriconazole"],
    drugCodesHint: ["NAT", "VOR"],
    indication: "Severe or deep fungal keratitis, especially when the causative organism (filamentous vs yeast) is uncertain or natamycin penetration is inadequate",
    mechanism:
      "Not a classical synergy pairing but a broadened-spectrum/rescue combination: natamycin (polyene, poor stromal penetration but strong first-line activity especially against Fusarium) combined with voriconazole (azole, better stromal/intraocular penetration, broader yeast coverage) for cases not responding to natamycin monotherapy or with deep stromal involvement.",
    caveat:
      "Natamycin remains first-line monotherapy for filamentous fungal keratitis (esp. Fusarium) per major trials (e.g. MUTT); add or switch to voriconazole for poor response, deep/endothelial involvement, or where Candida/yeast is more likely.",
    source: "Mycotic Ulcer Treatment Trial (MUTT); standard fungal keratitis management literature",
  },
];

function buildCandidates() {
  const candidates = [];
  for (const reg of COMBINATION_REGIMENS) {
    candidates.push({ value: reg.name.toLowerCase(), ref: reg });
    for (const d of reg.drugs) candidates.push({ value: d.toLowerCase(), ref: reg });
  }
  return candidates;
}
const FUZZY_CANDIDATES = buildCandidates();

// Searches combination regimens by free text against name, drug components,
// indication, and mechanism — with a fuzzy fallback so a typo'd drug name
// still surfaces relevant combinations instead of returning nothing.
export function searchCombinationRegimens(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return COMBINATION_REGIMENS;

  const directMatches = COMBINATION_REGIMENS.filter(
    (reg) =>
      reg.name.toLowerCase().includes(q) ||
      reg.indication.toLowerCase().includes(q) ||
      reg.mechanism.toLowerCase().includes(q) ||
      reg.drugs.some((d) => d.toLowerCase().includes(q))
  );
  if (directMatches.length > 0) return directMatches;

  const fuzzy = fuzzyBestMatch(q, FUZZY_CANDIDATES);
  return fuzzy ? [fuzzy] : [];
}

// Given a standardized organism code, surfaces combination regimens whose
// drug components include at least one antimicrobial commonly used against
// that organism in the app's own antimicrobial taxonomy — a lightweight,
// non-authoritative "what combos are relevant here" hint for the glossary.
export function getRegimensForDrugCode(antimicrobialCode) {
  if (!antimicrobialCode) return [];
  return COMBINATION_REGIMENS.filter((reg) => reg.drugCodesHint.includes(antimicrobialCode));
}
