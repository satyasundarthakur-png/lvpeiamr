// Standardized organism reference list, weighted toward ophthalmic pathogens.
// Each entry: canonical name + common raw-text synonyms seen in EMR/lab exports.
export const ORGANISMS = [
  { code: "PSAER", name: "Pseudomonas aeruginosa", gramType: "Gram-negative", synonyms: ["pseudomonas aeruginosa", "p. aeruginosa", "p aeruginosa", "pseudomonas"] },
  { code: "STAAUR", name: "Staphylococcus aureus", gramType: "Gram-positive", synonyms: ["staphylococcus aureus", "s. aureus", "staph aureus", "mssa", "mrsa"] },
  { code: "STACNS", name: "Coagulase-negative Staphylococcus", gramType: "Gram-positive", synonyms: ["cons", "coagulase negative staph", "s. epidermidis", "staphylococcus epidermidis"] },
  { code: "STRPNE", name: "Streptococcus pneumoniae", gramType: "Gram-positive", synonyms: ["streptococcus pneumoniae", "s. pneumoniae", "pneumococcus"] },
  { code: "STRVIR", name: "Viridans group Streptococcus", gramType: "Gram-positive", synonyms: ["viridans streptococcus", "strep viridans", "alpha hemolytic strep"] },
  { code: "ECOLI", name: "Escherichia coli", gramType: "Gram-negative", synonyms: ["escherichia coli", "e. coli", "e coli"] },
  { code: "KLEPNE", name: "Klebsiella pneumoniae", gramType: "Gram-negative", synonyms: ["klebsiella pneumoniae", "k. pneumoniae", "klebsiella"] },
  { code: "SERMAR", name: "Serratia marcescens", gramType: "Gram-negative", synonyms: ["serratia marcescens", "serratia"] },
  { code: "ENTCLO", name: "Enterobacter cloacae", gramType: "Gram-negative", synonyms: ["enterobacter cloacae", "enterobacter"] },
  { code: "PROMIR", name: "Proteus mirabilis", gramType: "Gram-negative", synonyms: ["proteus mirabilis", "proteus"] },
  { code: "MORCAT", name: "Moraxella catarrhalis", gramType: "Gram-negative", synonyms: ["moraxella catarrhalis", "moraxella"] },
  { code: "HAEINF", name: "Haemophilus influenzae", gramType: "Gram-negative", synonyms: ["haemophilus influenzae", "h. influenzae"] },
  { code: "CORSPP", name: "Corynebacterium species", gramType: "Gram-positive", synonyms: ["corynebacterium", "diphtheroids"] },
  { code: "BACSPP", name: "Bacillus species", gramType: "Gram-positive", synonyms: ["bacillus species", "bacillus cereus"] },
  { code: "FUNASP", name: "Aspergillus species", gramType: "Fungal", synonyms: ["aspergillus", "aspergillus fumigatus", "aspergillus flavus"] },
  { code: "FUNFUS", name: "Fusarium species", gramType: "Fungal", synonyms: ["fusarium", "fusarium solani"] },
  { code: "FUNCAN", name: "Candida species", gramType: "Fungal", synonyms: ["candida", "candida albicans"] },
  { code: "NOGROW", name: "No growth / sterile", gramType: "N/A", synonyms: ["no growth", "sterile", "negative culture", "no organism isolated"] },
  { code: "OTHER", name: "Other/unidentified organism", gramType: "N/A", synonyms: [] },
];

export function standardizeOrganism(rawText) {
  if (!rawText) return ORGANISMS.find((o) => o.code === "OTHER");
  const t = rawText.trim().toLowerCase();
  for (const org of ORGANISMS) {
    if (org.name.toLowerCase() === t) return org;
    if (org.synonyms.some((s) => t === s || t.includes(s))) return org;
  }
  return { code: "UNMAPPED", name: rawText.trim(), gramType: "Unknown", synonyms: [] };
}
