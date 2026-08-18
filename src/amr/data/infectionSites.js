// Standardized ophthalmic infection-site / diagnosis reference list.
// Unlike organism and antimicrobial, infection_site was previously free text
// with no recognition layer at all — this fills that gap so "corneal ulcer",
// "microbial keratitis", and "keratitis" all resolve to the same canonical
// entry instead of being treated as three different sites.
import { fuzzyBestMatch, matchesAsToken } from "../lib/fuzzyMatch.js";

export const INFECTION_SITES = [
  {
    code: "ENDO",
    name: "Endophthalmitis",
    category: "Intraocular",
    synonyms: ["endophthalmitis", "post-op endophthalmitis", "postoperative endophthalmitis", "post-injection endophthalmitis", "endogenous endophthalmitis"],
    note: "Infection of the vitreous/intraocular cavity — a sight-threatening emergency. Typically needs intravitreal ± systemic therapy; topical-only treatment has poor penetration.",
  },
  {
    code: "KERAT",
    name: "Microbial keratitis / Corneal ulcer",
    category: "Corneal",
    synonyms: ["microbial keratitis", "corneal ulcer", "keratitis", "bacterial keratitis", "fungal keratitis", "corneal infiltrate", "corneal abscess"],
    note: "Infection of the cornea, bacterial or fungal. Fusarium/Aspergillus are common fungal causes in agricultural/tropical settings; Pseudomonas is a classic aggressive bacterial cause, especially in contact lens wearers.",
  },
  {
    code: "SSI",
    name: "Surgical site infection",
    category: "Post-surgical",
    synonyms: ["surgical site", "surgical site infection", "ssi", "wound infection", "post-op infection", "postoperative wound infection"],
    note: "Infection at the incision/surgical wound itself, distinct from endophthalmitis (intraocular spread). Staphylococcus species are the most common cause.",
  },
  {
    code: "CONJ",
    name: "Conjunctivitis",
    category: "Surface",
    synonyms: ["conjunctivitis", "pink eye", "bacterial conjunctivitis", "viral conjunctivitis", "acute conjunctivitis"],
    note: "Common, usually self-limited surface infection. S. pneumoniae and H. influenzae are frequent bacterial causes, especially in children.",
  },
  {
    code: "DACRYO",
    name: "Dacryocystitis",
    category: "Adnexal",
    synonyms: ["dacryocystitis", "lacrimal sac infection", "nasolacrimal duct infection"],
    note: "Infection of the lacrimal sac, usually secondary to nasolacrimal duct obstruction. Often requires DCR (dacryocystorhinostomy) alongside antibiotics for recurrent cases.",
  },
  {
    code: "ORBIT",
    name: "Orbital cellulitis",
    category: "Adnexal/Orbital",
    synonyms: ["orbital cellulitis", "orbital infection", "post-septal cellulitis"],
    note: "Sight- and life-threatening infection posterior to the orbital septum, often from sinus spread. Requires urgent systemic (often IV) therapy and close monitoring for intracranial extension.",
  },
  {
    code: "PRESEP",
    name: "Preseptal cellulitis",
    category: "Adnexal",
    synonyms: ["preseptal cellulitis", "periorbital cellulitis"],
    note: "Infection anterior to the orbital septum — less severe than orbital cellulitis but must be distinguished from it, since management differs significantly.",
  },
  {
    code: "SCLER",
    name: "Scleritis / Infectious scleritis",
    category: "Scleral",
    synonyms: ["scleritis", "infectious scleritis", "microbial scleritis"],
    note: "Uncommon but severe; infectious scleritis often follows ocular surgery or trauma and can be aggressive, sometimes needing surgical debridement alongside antimicrobials.",
  },
  {
    code: "BLEPH",
    name: "Blepharitis",
    category: "Adnexal",
    synonyms: ["blepharitis", "lid margin infection", "blepharoconjunctivitis"],
    note: "Chronic lid-margin inflammation/infection, commonly linked to Staphylococcus species and Demodex; usually managed with lid hygiene ± topical antibiotics.",
  },
  {
    code: "UNSPEC",
    name: "Unspecified / other ocular site",
    category: "Other",
    synonyms: [],
    note: "Site reported but not in the standard taxonomy — check spelling or add a synonym mapping.",
  },
];

function buildCandidates() {
  const candidates = [];
  for (const site of INFECTION_SITES) {
    candidates.push({ value: site.name.toLowerCase(), ref: site });
    for (const s of site.synonyms) candidates.push({ value: s, ref: site });
  }
  return candidates;
}
const FUZZY_CANDIDATES = buildCandidates();

export function standardizeInfectionSite(rawText) {
  if (!rawText) return INFECTION_SITES.find((s) => s.code === "UNSPEC");
  const t = rawText.trim().toLowerCase();
  for (const site of INFECTION_SITES) {
    if (site.name.toLowerCase() === t) return site;
    if (site.synonyms.some((s) => t === s || matchesAsToken(t, s))) return site;
  }
  const fuzzy = fuzzyBestMatch(t, FUZZY_CANDIDATES);
  if (fuzzy) return { ...fuzzy, fuzzyMatched: true };
  return { code: "UNMAPPED", name: rawText.trim(), category: "Unknown", synonyms: [] };
}
