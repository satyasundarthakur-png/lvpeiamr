// Standardized organism reference list, weighted toward ophthalmic pathogens.
// Each entry: canonical name + common raw-text synonyms seen in EMR/lab exports.
import { fuzzyBestMatch } from "../lib/fuzzyMatch.js";

export const ORGANISMS = [
  { code: "PSAER", name: "Pseudomonas aeruginosa", gramType: "Gram-negative", synonyms: ["pseudomonas aeruginosa", "p. aeruginosa", "p aeruginosa", "pseudomonas"], note: "Common cause of severe, rapidly progressive corneal ulcers and post-surgical endophthalmitis; classically associated with contact lens wear." },
  { code: "STAAUR", name: "Staphylococcus aureus", gramType: "Gram-positive", synonyms: ["staphylococcus aureus", "s. aureus", "staph aureus", "mssa", "mrsa"], note: "Leading cause of blepharitis, conjunctivitis, and post-operative surgical-site infection; MRSA strains need vancomycin or alternatives to beta-lactams." },
  { code: "STACNS", name: "Coagulase-negative Staphylococcus", gramType: "Gram-positive", synonyms: ["cons", "coagulase negative staph", "s. epidermidis", "staphylococcus epidermidis"], note: "Normal ocular surface flora that can become pathogenic after intraocular surgery or device placement; frequently shows high azithromycin/methicillin resistance in surveillance data." },
  { code: "STRPNE", name: "Streptococcus pneumoniae", gramType: "Gram-positive", synonyms: ["streptococcus pneumoniae", "s. pneumoniae", "pneumococcus"], note: "Classic cause of acute bacterial conjunctivitis and, less commonly, aggressive corneal ulceration ('pneumococcal ulcer')." },
  { code: "STRVIR", name: "Viridans group Streptococcus", gramType: "Gram-positive", synonyms: ["viridans streptococcus", "strep viridans", "alpha hemolytic strep"], note: "Oral/ocular commensal flora implicated in post-traumatic and post-surgical endophthalmitis, sometimes with an indolent course." },
  { code: "ECOLI", name: "Escherichia coli", gramType: "Gram-negative", synonyms: ["escherichia coli", "e. coli", "e coli"], note: "Gram-negative enteric organism, an uncommon but recognized cause of endophthalmitis, especially in immunocompromised or endogenous (bloodstream-seeded) infection." },
  { code: "KLEPNE", name: "Klebsiella pneumoniae", gramType: "Gram-negative", synonyms: ["klebsiella pneumoniae", "k. pneumoniae", "klebsiella"], note: "Important cause of endogenous endophthalmitis, particularly linked to liver abscess/hepatobiliary sepsis in diabetic patients in South/Southeast Asia." },
  { code: "SERMAR", name: "Serratia marcescens", gramType: "Gram-negative", synonyms: ["serratia marcescens", "serratia"], note: "Associated with contact-lens-related keratitis and contaminated ophthalmic solutions/equipment outbreaks." },
  { code: "ENTCLO", name: "Enterobacter cloacae", gramType: "Gram-negative", synonyms: ["enterobacter cloacae", "enterobacter"], note: "Gram-negative organism occasionally implicated in post-surgical and post-traumatic endophthalmitis." },
  { code: "PROMIR", name: "Proteus mirabilis", gramType: "Gram-negative", synonyms: ["proteus mirabilis", "proteus"], note: "Uncommon ocular pathogen, more often seen in mixed or post-traumatic infections." },
  { code: "MORCAT", name: "Moraxella catarrhalis", gramType: "Gram-negative", synonyms: ["moraxella catarrhalis", "moraxella"], note: "Classically associated with indolent, chronic angular blepharoconjunctivitis." },
  { code: "HAEINF", name: "Haemophilus influenzae", gramType: "Gram-negative", synonyms: ["haemophilus influenzae", "h. influenzae"], note: "Common pediatric conjunctivitis pathogen, sometimes with associated preseptal cellulitis ('conjunctivitis-otitis syndrome')." },
  { code: "CORSPP", name: "Corynebacterium species", gramType: "Gram-positive", synonyms: ["corynebacterium", "diphtheroids"], note: "Usually normal lid-margin flora; occasionally a true pathogen in chronic blepharitis or low-grade keratitis." },
  { code: "BACSPP", name: "Bacillus species", gramType: "Gram-positive", synonyms: ["bacillus species", "bacillus cereus"], note: "Bacillus cereus causes fulminant, rapidly destructive post-traumatic endophthalmitis, classically after soil-contaminated injury." },
  { code: "FUNASP", name: "Aspergillus species", gramType: "Fungal", synonyms: ["aspergillus", "aspergillus fumigatus", "aspergillus flavus"], note: "Filamentous fungus causing severe keratitis and endophthalmitis, more common after trauma with vegetative matter or in immunocompromised hosts." },
  { code: "FUNFUS", name: "Fusarium species", gramType: "Fungal", synonyms: ["fusarium", "fusarium solani"], note: "Leading cause of fungal keratitis in tropical/agricultural settings; classic feathery-edged corneal infiltrate, natamycin first-line." },
  { code: "FUNCAN", name: "Candida species", gramType: "Fungal", synonyms: ["candida", "candida albicans"], note: "Yeast pathogen more typical of endogenous endophthalmitis (from candidemia) than primary keratitis." },
  { code: "NOGROW", name: "No growth / sterile", gramType: "N/A", synonyms: ["no growth", "sterile", "negative culture", "no organism isolated"], note: "Culture-negative case — common in clinically diagnosed infection, prior antibiotic exposure, or non-infectious mimics." },
  { code: "OTHER", name: "Other/unidentified organism", gramType: "N/A", synonyms: [], note: "Organism reported but not in the standard taxonomy — check spelling or add a synonym mapping." },
];

function buildCandidates() {
  const candidates = [];
  for (const org of ORGANISMS) {
    candidates.push({ value: org.name.toLowerCase(), ref: org });
    for (const s of org.synonyms) candidates.push({ value: s, ref: org });
  }
  return candidates;
}
const FUZZY_CANDIDATES = buildCandidates();

export function standardizeOrganism(rawText) {
  if (!rawText) return ORGANISMS.find((o) => o.code === "OTHER");
  const t = rawText.trim().toLowerCase();
  for (const org of ORGANISMS) {
    if (org.name.toLowerCase() === t) return org;
    if (org.synonyms.some((s) => t === s || t.includes(s))) return org;
  }
  // Fallback: catch typos/near-misses (e.g. "psuedomonas") before giving up.
  const fuzzy = fuzzyBestMatch(t, FUZZY_CANDIDATES);
  if (fuzzy) return { ...fuzzy, fuzzyMatched: true };
  return { code: "UNMAPPED", name: rawText.trim(), gramType: "Unknown", synonyms: [] };
}
