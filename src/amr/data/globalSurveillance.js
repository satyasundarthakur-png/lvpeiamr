// Curated reference list of real, named antimicrobial-resistance surveillance
// programs and landmark ocular-microbiology literature. This is a static,
// hand-verified dataset (no live API) — it exists to give the user fast,
// trustworthy jumping-off points for how their local antibiogram compares to
// published global/national trends, and to ground the AI trends briefing so
// it references real programs instead of inventing sources.
//
// Each entry lists organismCodes it's most relevant to (matching codes in
// data/organisms.js) so the UI can surface the right references for whatever
// organisms actually appear in the user's uploaded data.

export const SURVEILLANCE_PROGRAMS = [
  {
    id: "armor",
    name: "ARMOR (Antibiotic Resistance Monitoring in Ocular MicRoorganisms)",
    scope: "US nationwide, ocular-pathogen-specific",
    summary:
      "The only ongoing nationwide surveillance program specific to ocular pathogens, running since 2009. Tracks in vitro resistance in S. aureus, coagulase-negative staphylococci, S. pneumoniae, P. aeruginosa, and H. influenzae from eye infections across dozens of US sites.",
    organismCodes: ["STAAUR", "STACNS", "STRPNE", "PSAER", "HAEINF"],
    url: "https://pubmed.ncbi.nlm.nih.gov/30281547/",
  },
  {
    id: "who-glass",
    name: "WHO GLASS (Global Antimicrobial Resistance and Use Surveillance System)",
    scope: "Global, all infection sites",
    summary:
      "WHO's global surveillance system for antimicrobial resistance and antimicrobial use, aggregating standardized data from 127+ countries. Not ophthalmology-specific, but the reference point for how resistance in common organisms (S. aureus, E. coli, Klebsiella, etc.) is trending worldwide.",
    organismCodes: ["STAAUR", "ECOLI", "KLEPNE", "PSAER"],
    url: "https://www.who.int/initiatives/glass",
  },
  {
    id: "ears-net",
    name: "EARS-Net (European Antimicrobial Resistance Surveillance Network)",
    scope: "European Union / EEA, all infection sites",
    summary:
      "The largest publicly funded AMR surveillance system in Europe, run by ECDC. Useful benchmark for Gram-negative resistance trends (Klebsiella, E. coli, Pseudomonas) if comparing against European rather than US/global data.",
    organismCodes: ["ECOLI", "KLEPNE", "PSAER"],
    url: "https://www.ecdc.europa.eu/en/about-us/networks/disease-networks-and-laboratory-networks/ears-net-data",
  },
  {
    id: "aravind-icmr",
    name: "ICMR AMR Surveillance Network (India)",
    scope: "India, national",
    summary:
      "India's national AMR surveillance network coordinated by ICMR, reporting resistance trends across a growing number of sentinel sites. The most directly comparable national-level dataset for an Indian tertiary eye-care setting, though it is not ocular-infection-specific.",
    organismCodes: ["STAAUR", "ECOLI", "KLEPNE", "PSAER", "STRPNE"],
    url: "https://main.icmr.nic.in/content/amr",
  },
];

// Landmark / frequently-cited ocular microbiology literature, again keyed by
// organism so the app can surface what's relevant to the user's own data.
export const KEY_LITERATURE = [
  {
    id: "armor-conjunctival-2018",
    title: "Antibiotic resistance among bacterial conjunctival pathogens (ARMOR, 2009–2016)",
    organismCodes: ["STAAUR", "STACNS", "STRPNE", "PSAER", "HAEINF"],
    note: "Reports methicillin resistance in a large share of staphylococcal ocular isolates and generally low resistance in P. aeruginosa and H. influenzae over the study period.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6193682/",
  },
  {
    id: "armor-pediatric",
    title: "Antibiotic resistance among pediatric-sourced ocular pathogens — 8-year ARMOR findings",
    organismCodes: ["STAAUR", "STACNS", "STRPNE"],
    note: "Documents high rates of azithromycin resistance and multidrug resistance among staphylococcal and pneumococcal isolates from pediatric ocular infections specifically.",
    url: "https://pubmed.ncbi.nlm.nih.gov/30281547/",
  },
  {
    id: "fungal-keratitis-review",
    title: "Global burden and management of fungal keratitis (Fusarium, Aspergillus, Candida)",
    organismCodes: ["FUNFUS", "FUNASP", "FUNCAN"],
    note: "Fungal keratitis remains disproportionately common in tropical/agricultural settings; natamycin remains first-line for filamentous fungi, with voriconazole and amphotericin B as alternatives in refractory or deep disease.",
    url: "https://pubmed.ncbi.nlm.nih.gov/?term=fungal+keratitis+global+burden+review",
  },
  {
    id: "endophthalmitis-route",
    title: "Endophthalmitis management and the case for intravitreal/systemic over topical therapy",
    organismCodes: ["STAAUR", "STACNS", "PSAER", "KLEPNE"],
    note: "Topical antibiotics achieve poor intravitreal penetration; treatment-failure analyses of endophthalmitis repeatedly point to route of administration, not resistance alone, as a major driver of poor outcomes — consistent with this app's route-mismatch flag.",
    url: "https://pubmed.ncbi.nlm.nih.gov/?term=endophthalmitis+intravitreal+antibiotic+route+treatment+failure",
  },
];

// Returns the surveillance programs and literature relevant to a given set of
// organism codes present in the user's own antibiogram — used to avoid
// showing irrelevant references when, say, no fungal organisms are present.
export function getRelevantReferences(organismCodes = []) {
  const codeSet = new Set(organismCodes.filter(Boolean));
  const matches = (refCodes) => refCodes.some((c) => codeSet.has(c));

  const programs = codeSet.size
    ? SURVEILLANCE_PROGRAMS.filter((p) => matches(p.organismCodes))
    : SURVEILLANCE_PROGRAMS;
  const literature = codeSet.size
    ? KEY_LITERATURE.filter((l) => matches(l.organismCodes))
    : KEY_LITERATURE;

  // Always include WHO GLASS as a general baseline even if no organism matched.
  const programsFinal = programs.length ? programs : SURVEILLANCE_PROGRAMS;
  const literatureFinal = literature.length ? literature : KEY_LITERATURE;

  return { programs: programsFinal, literature: literatureFinal };
}
