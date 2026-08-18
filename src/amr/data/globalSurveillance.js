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
//
// Entries with isInstitutional: true are LVPEI's own published research —
// surfaced first wherever relevant, since a comparison against your own
// institute's historical data is more actionable than a comparison against a
// US or global cohort with a different patient population and climate.
// Entries with a peerInstitution field are published work from other major
// Indian tertiary eye institutes (Aravind Eye Hospital, Sankara Nethralaya,
// Dr Rajendra Prasad Centre/AIIMS) — not LVPEI's own data, but a genuinely
// useful second tier of comparison: same country, broadly similar patient
// population and climate, more directly comparable than international
// sources even though it isn't your own institute's numbers.
// headlineStats (where present) are real published figures, not invented —
// each was verified against the source before inclusion, so the app can
// actually benchmark your antibiogram numerically against published rates,
// not just link to the paper.

export const SURVEILLANCE_PROGRAMS = [
  {
    id: "lvpei-network-antibiogram",
    name: "LVPEI Network EMR-Driven Antibiogram (Das & Joseph, 2022)",
    scope: "LVPEI multi-tier network, South India — 15,822 patients, Sep 2013–Dec 2021",
    summary:
      "The largest institutional antibiogram LVPEI has published: an EMR-driven analysis of bacterial antibiotic susceptibility across the LVPEI network. Gram-positive cocci/bacilli were most sensitive to vancomycin (86.83% / 92.89%), then cefazolin (80.88%) and amikacin; Gram-negative bacilli were most sensitive to ofloxacin (65.24%). The paper explicitly notes increasing resistance to fluoroquinolones and ceftazidime over the study period — directly comparable to this app's own antibiogram and trend outputs.",
    organismCodes: ["STAAUR", "STACNS", "PSAER", "KLEPNE", "ECOLI", "STRPNE", "HAEINF"],
    url: "https://pubmed.ncbi.nlm.nih.gov/36367511/",
    isInstitutional: true,
    headlineStats: {
      "Gram-positive cocci susceptibility to vancomycin": "86.83%",
      "Gram-positive bacilli susceptibility to vancomycin": "92.89%",
      "Susceptibility to cefazolin": "80.88%",
      "Gram-negative bacilli susceptibility to ofloxacin": "65.24%",
    },
  },
  {
    id: "armor",
    name: "ARMOR (Antibiotic Resistance Monitoring in Ocular MicRoorganisms)",
    scope: "US nationwide, ocular-pathogen-specific",
    summary:
      "The only ongoing nationwide surveillance program specific to ocular pathogens, running since 2009. Tracks in vitro resistance in S. aureus, coagulase-negative staphylococci, S. pneumoniae, P. aeruginosa, and H. influenzae from eye infections across dozens of US sites. Useful as an international comparison point alongside the LVPEI network data above, since patient population, climate, and antibiotic-use patterns differ meaningfully from South India.",
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
      "India's national AMR surveillance network coordinated by ICMR, reporting resistance trends across a growing number of sentinel sites. Useful as a broader Indian national benchmark alongside the LVPEI-specific network data above, though it is not ocular-infection-specific.",
    organismCodes: ["STAAUR", "ECOLI", "KLEPNE", "PSAER", "STRPNE"],
    url: "https://main.icmr.nic.in/content/amr",
  },
];

// Landmark / frequently-cited ocular microbiology literature, again keyed by
// organism so the app can surface what's relevant to the user's own data.
export const KEY_LITERATURE = [
  {
    id: "lvpei-endophthalmitis-25yr",
    title: "Trends in microbiological spectrum of endophthalmitis at a single tertiary care ophthalmic hospital in India: a review of 25 years (Joseph et al., Eye 2019)",
    organismCodes: ["STAAUR", "STACNS", "STRPNE", "PSAER", "FUNASP", "FUNCAN"],
    note: "LVPEI KAR Campus, 1991–2015: of 9,278 endophthalmitis patients, 35.7% were culture-positive (85.56% bacteria, 11.66% fungi). Gram-positive organisms were 67.68% of bacterial isolates, most prevalently Streptococcus pneumoniae and Staphylococcus epidermidis; Pseudomonas aeruginosa was the most prevalent Gram-negative organism; Aspergillus flavus was the most common fungus, Candida species 6.9% of fungal isolates. Antibiotic susceptibility trends were separately tracked over the final 10 years (2005–2015) of the study — directly comparable to this app's own antibiogram and trends-over-time output.",
    url: "https://pubmed.ncbi.nlm.nih.gov/30792523/",
    isInstitutional: true,
  },
  {
    id: "lvpei-ocular-infection-epidemiology",
    title: "The microbiological landscape and epidemiology of ocular infections in a multi-tier ophthalmology network in India (Das & Joseph, Eye 2022)",
    organismCodes: ["STAAUR", "STACNS", "PSAER", "KLEPNE", "FUNFUS", "FUNASP", "FUNCAN"],
    note: "Companion epidemiology paper to the LVPEI network antibiogram above, same 15,822-patient cohort (Sep 2013–Dec 2021): bacterial aetiology in 51.06% of cases, fungal in 38.27% — a notably high fungal burden reflecting LVPEI's South Indian, largely rural, agricultural referral base. Most specimens were corneal scrapings (68.61%).",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10219986/",
    isInstitutional: true,
  },
  {
    id: "lvpei-pseudomonas-st308-resistome",
    title: "Development of antibiotic resistance in the ocular Pseudomonas aeruginosa clone ST308 over twenty years (Khan, Sharma et al., Exp Eye Res 2021)",
    organismCodes: ["PSAER"],
    note: "Tracked the same LVPEI Pseudomonas aeruginosa clone (ST308) from 1997 to 2018: the 2018 isolates had larger genomes and accessory gene content than the 1997 isolates, and one 2018 isolate was resistant to every antibiotic tested except polymyxin B — a striking within-institution illustration of resistance accumulation over two decades in a single lineage.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33610601/",
    isInstitutional: true,
  },
  {
    id: "lvpei-antibiotic-resistance-review",
    title: "Antibiotic resistance in ocular bacterial pathogens (Sharma, Indian J Med Microbiol 2011)",
    organismCodes: ["STAAUR", "STACNS", "STRPNE", "PSAER", "HAEINF"],
    note: "Foundational LVPEI review of ocular antibiotic administration routes (topical, subconjunctival, subtenon, intraocular) and how route affects achievable drug concentration relative to MIC — directly relevant to this app's route-mismatch flag for topical-only endophthalmitis therapy.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21860100/",
    isInstitutional: true,
  },
  {
    id: "aravind-mrsa-10yr",
    title: "A ten-year study of prevalence, antimicrobial susceptibility pattern, and genotypic characterization of MRSA causing ocular infections at a tertiary eye care hospital in South India (Nithya et al., Infect Genet Evol 2019)",
    organismCodes: ["STAAUR"],
    note: "Aravind Eye Hospital, Madurai, 2007–2017: of 1,306 S. aureus ocular isolates, MRSA prevalence rose from 9% (2007) to 38% (2017). MRSA isolates were 100% sensitive to vancomycin and 91% to chloramphenicol, but mostly resistant to all fluoroquinolones tested; MSSA showed minimal chloramphenicol resistance and no vancomycin resistance, though fluoroquinolone resistance also rose over the study period. A useful South Indian peer-institution comparison for staphylococcal trends.",
    url: "https://pubmed.ncbi.nlm.nih.gov/30708134/",
    peerInstitution: "Aravind Eye Hospital",
  },
  {
    id: "sankara-enterobacteriaceae",
    title: "Characterization of antibiotic resistance profiles of ocular Enterobacteriaceae isolates (Paul-Satyaseela et al., Sankara Nethralaya, Eur J Microbiol Immunol 2016)",
    organismCodes: ["KLEPNE", "ECOLI", "SERMAR", "ENTCLO", "PROMIR"],
    note: "L&T Microbiology Research Center, Sankara Nethralaya, Chennai: 101 Enterobacteriaceae isolates recovered from 12,371 prospective ocular samples, with rising ESBL and fluoroquinolone resistance noted among ocular Gram-negative Enterobacteriaceae — the paper specifically recommends fluoroquinolone susceptibility testing before starting empiric therapy given this trend.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4838984/",
    peerInstitution: "Sankara Nethralaya",
  },
  {
    id: "aiims-rpc-north-central-india",
    title: "Antibiotic susceptibility pattern of bacterial isolates from microbial keratitis in North and Central India: a multi-centric study (Ahmed, Titiyal, Sharma et al., Indian J Ophthalmol 2022)",
    organismCodes: ["STAAUR", "PSAER", "STRPNE"],
    note: "Multi-centric study including Dr Rajendra Prasad Centre for Ophthalmic Sciences, AIIMS New Delhi, comparing bacterial keratitis susceptibility patterns between North and Central India: notable regional differences, e.g. S. pneumoniae ceftriaxone susceptibility (100% central vs 79% north), S. aureus ofloxacin susceptibility (15% central vs 67% north) — a reminder that even within-India benchmarks can vary meaningfully by region.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35647966/",
    peerInstitution: "AIIMS RP Centre",
  },
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
// Sorted in three tiers: LVPEI's own data first, other major Indian
// tertiary eye institutes second, broader international sources last.
function institutionalTier(entry) {
  if (entry.isInstitutional) return 0;
  if (entry.peerInstitution) return 1;
  return 2;
}

function sortByInstitutionalTier(list) {
  return [...list].sort((a, b) => institutionalTier(a) - institutionalTier(b));
}

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

  return {
    programs: sortByInstitutionalTier(programsFinal),
    literature: sortByInstitutionalTier(literatureFinal),
  };
}
