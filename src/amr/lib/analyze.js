import { standardizeOrganism } from "../data/organisms.js";
import { standardizeAntimicrobial } from "../data/antimicrobials.js";
import { standardizeInfectionSite } from "../data/infectionSites.js";

const RESISTANT_TOKENS = ["r", "resistant", "res"];
const SUSCEPTIBLE_TOKENS = ["s", "susceptible", "sensitive", "sens"];
const INTERMEDIATE_TOKENS = ["i", "intermediate"];

function classifyRSI(raw) {
  if (!raw) return "Unknown";
  const t = String(raw).trim().toLowerCase();
  if (RESISTANT_TOKENS.includes(t)) return "R";
  if (SUSCEPTIBLE_TOKENS.includes(t)) return "S";
  if (INTERMEDIATE_TOKENS.includes(t)) return "I";
  return "Unknown";
}

// Normalize one raw uploaded row into a standardized record.
export function standardizeRecord(row) {
  const organism = standardizeOrganism(row.organism);
  const antimicrobial = standardizeAntimicrobial(row.antimicrobial_given);
  const site = standardizeInfectionSite(row.infection_site);
  const rsi = classifyRSI(row.susceptibility_result);

  let concordance = "Unclassified";
  if (organism.code === "NOGROW") {
    concordance = "No organism isolated";
  } else if (rsi === "R") {
    concordance = "Discordant (resistant to therapy given)";
  } else if (rsi === "S" || rsi === "I") {
    const outcome = String(row.outcome || "").toLowerCase();
    const failed = /fail|reoperat|readmit|worsen|no improvement|persist/.test(outcome);
    concordance = failed
      ? "Concordant but clinical failure (non-microbiological cause likely)"
      : "Concordant, resolved";
  }

  return {
    ...row,
    organism_standardized: organism.name,
    organism_code: organism.code,
    gram_type: organism.gramType,
    organism_fuzzy_matched: !!organism.fuzzyMatched,
    antimicrobial_standardized: antimicrobial.name,
    antimicrobial_class: antimicrobial.class,
    antimicrobial_fuzzy_matched: !!antimicrobial.fuzzyMatched,
    site_standardized: site.name,
    site_code: site.code,
    site_category: site.category,
    site_fuzzy_matched: !!site.fuzzyMatched,
    rsi,
    concordance,
  };
}

export function standardizeDataset(rows) {
  return rows.map(standardizeRecord);
}

// Build an antibiogram: organism x antimicrobial -> % susceptible
export function buildAntibiogram(records, { firstIsolateOnly = true } = {}) {
  const source = firstIsolateOnly ? getFirstIsolatePerPatient(records) : records;
  const grid = {};
  source.forEach((r) => {
    if (r.rsi === "Unknown" || r.organism_code === "NOGROW") return;
    const key = r.organism_standardized;
    if (!grid[key]) grid[key] = {};
    const abKey = r.antimicrobial_standardized;
    if (!grid[key][abKey]) grid[key][abKey] = { S: 0, I: 0, R: 0, total: 0 };
    grid[key][abKey][r.rsi] += 1;
    grid[key][abKey].total += 1;
  });

  const table = [];
  Object.entries(grid).forEach(([organism, drugs]) => {
    Object.entries(drugs).forEach(([antimicrobial, counts]) => {
      table.push({
        organism,
        antimicrobial,
        n: counts.total,
        pctSusceptible: Math.round(((counts.S) / counts.total) * 100),
        pctResistant: Math.round(((counts.R) / counts.total) * 100),
      });
    });
  });
  return table.sort((a, b) => a.organism.localeCompare(b.organism));
}

// CLSI M39 ("Analysis and Presentation of Cumulative Antimicrobial
// Susceptibility Test Data") recommends including only the FIRST isolate of
// a given species per patient in the analysis period, irrespective of body
// site or susceptibility result — otherwise a single patient with repeated
// cultures (e.g. a non-resolving infection re-cultured multiple times) can
// skew the whole cumulative antibiogram toward that patient's resistance
// pattern. This mirrors the same rule used by WHONET and the R `AMR`
// package's `first_isolate()`. Records missing patient_id or organism_code
// can't be deduplicated meaningfully and pass through unchanged.
export function getFirstIsolatePerPatient(records) {
  const groups = new Map();
  const passthrough = [];

  records.forEach((r) => {
    if (!r.patient_id || !r.organism_code || r.organism_code === "NOGROW") {
      passthrough.push(r);
      return;
    }
    const key = `${r.patient_id}::${r.organism_code}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const firstIsolates = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      firstIsolates.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => {
      const da = Date.parse(a.episode_date);
      const db = Date.parse(b.episode_date);
      if (Number.isNaN(da) && Number.isNaN(db)) return 0;
      if (Number.isNaN(da)) return 1; // undated records sort after dated ones
      if (Number.isNaN(db)) return -1;
      return da - db;
    });
    firstIsolates.push(sorted[0]);
  }

  return [...passthrough, ...firstIsolates];
}

// Flag patterns worth surfacing to an infection-control / stewardship reviewer.
export function flagPatterns(records) {
  const flags = [];

  // 1. Discordant empiric therapy cases (resistant organism, drug still given)
  const discordant = records.filter((r) => r.concordance.startsWith("Discordant"));
  if (discordant.length > 0) {
    flags.push({
      severity: "high",
      title: `${discordant.length} case(s) of discordant empiric therapy`,
      detail: "Antibiotic given was resistant per culture — infection occurred/persisted despite treatment.",
      records: discordant,
    });
  }

  // 2. Concordant but clinically failed (non-microbiological failure)
  const concordantFail = records.filter((r) => r.concordance.startsWith("Concordant but"));
  if (concordantFail.length > 0) {
    flags.push({
      severity: "medium",
      title: `${concordantFail.length} case(s) of clinical failure despite susceptible organism`,
      detail: "Organism was susceptible to the drug given, but outcome indicates failure — check dosing, route/penetration, adherence, or biofilm/foreign-body source.",
      records: concordantFail,
    });
  }

  // 3. Rising resistance per organism-drug pair (needs >= 5 tested to be meaningful)
  const antibiogram = buildAntibiogram(records);
  const highResistance = antibiogram.filter((a) => a.n >= 5 && a.pctResistant >= 30);
  if (highResistance.length > 0) {
    flags.push({
      severity: "high",
      title: `${highResistance.length} organism-antibiotic pair(s) with \u226530% resistance`,
      detail: "These combinations may no longer be reliable as empiric first-line choices at this volume of testing.",
      records: highResistance,
    });
  }

  // 4. Site clusters — same infection_site with repeated discordance
  const bySite = {};
  discordant.forEach((r) => {
    const site = r.infection_site || "Unspecified site";
    bySite[site] = (bySite[site] || 0) + 1;
  });
  Object.entries(bySite).forEach(([site, count]) => {
    if (count >= 3) {
      flags.push({
        severity: "high",
        title: `Cluster: ${count} discordant cases at "${site}"`,
        detail: "Repeated empiric mismatches at the same infection site may indicate the current empiric policy for this site needs review.",
        records: discordant.filter((r) => (r.infection_site || "Unspecified site") === site),
      });
    }
  });

  // 5. Route-of-administration mismatch: topical therapy for a deep infection
  // (endophthalmitis) where systemic/intravitreal penetration is usually needed.
  const routeMismatch = records.filter((r) => {
    const site = String(r.infection_site || "").toLowerCase();
    const route = String(r.route || "").toLowerCase();
    return site.includes("endophthalmitis") && route.includes("topical");
  });
  if (routeMismatch.length > 0) {
    flags.push({
      severity: "medium",
      title: `${routeMismatch.length} endophthalmitis case(s) treated with topical-only therapy`,
      detail: "Topical antibiotics have limited intraocular penetration. Endophthalmitis typically needs intravitreal and/or systemic therapy — review whether route, not resistance, explains treatment failure here.",
      records: routeMismatch,
    });
  }

  return flags.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
}

// Rule-based remedy suggestions (used as a fallback / supplement to AI narrative).
export function suggestRemedies(records) {
  const antibiogram = buildAntibiogram(records);
  const suggestions = [];

  const byOrganism = {};
  antibiogram.forEach((row) => {
    if (!byOrganism[row.organism]) byOrganism[row.organism] = [];
    byOrganism[row.organism].push(row);
  });

  Object.entries(byOrganism).forEach(([organism, rows]) => {
    const bestCoverage = rows
      .filter((r) => r.n >= 3)
      .sort((a, b) => b.pctSusceptible - a.pctSusceptible)[0];
    const worst = rows
      .filter((r) => r.n >= 3 && r.pctResistant >= 30)
      .sort((a, b) => b.pctResistant - a.pctResistant);

    if (bestCoverage) {
      suggestions.push({
        organism,
        message: `Best current empiric coverage for ${organism}: ${bestCoverage.antimicrobial} (${bestCoverage.pctSusceptible}% susceptible, n=${bestCoverage.n}).`,
      });
    }
    worst.forEach((w) => {
      suggestions.push({
        organism,
        message: `Reconsider ${w.antimicrobial} as empiric choice for ${organism} — ${w.pctResistant}% resistance observed (n=${w.n}).`,
      });
    });
  });

  return suggestions;
}

// Recognition audit: surfaces which raw uploaded terms (organism,
// antimicrobial, infection site) were NOT recognized outright and either
// needed fuzzy matching (likely typo, worth a quick glance) or fell through
// entirely to UNMAPPED (genuinely unrecognized — worth adding as a synonym
// or fixing at the source). Helps an ophthalmologist trust — or correct —
// what the standardization step actually did to their data.
export function getRecognitionAudit(records) {
  const fuzzyMatches = [];
  const unmapped = [];

  records.forEach((r) => {
    if (r.organism_fuzzy_matched) {
      fuzzyMatches.push({ field: "organism", raw: r.organism, resolvedTo: r.organism_standardized });
    } else if (r.organism_code === "UNMAPPED") {
      unmapped.push({ field: "organism", raw: r.organism });
    }

    if (r.antimicrobial_fuzzy_matched) {
      fuzzyMatches.push({ field: "antimicrobial", raw: r.antimicrobial_given, resolvedTo: r.antimicrobial_standardized });
    } else if (r.antimicrobial_class === "Unknown") {
      unmapped.push({ field: "antimicrobial", raw: r.antimicrobial_given });
    }

    if (r.site_fuzzy_matched) {
      fuzzyMatches.push({ field: "infection_site", raw: r.infection_site, resolvedTo: r.site_standardized });
    } else if (r.site_code === "UNMAPPED") {
      unmapped.push({ field: "infection_site", raw: r.infection_site });
    }
  });

  // De-duplicate by field+raw so repeated occurrences show once.
  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((item) => {
      const key = `${item.field}::${(item.raw || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return { fuzzyMatches: dedupe(fuzzyMatches), unmapped: dedupe(unmapped) };
}
