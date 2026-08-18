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
  } else if (rsi === "S") {
    const outcome = String(row.outcome || "").toLowerCase();
    const failed = /fail|reoperat|readmit|worsen|no improvement|persist/.test(outcome);
    concordance = failed
      ? "Concordant but clinical failure (non-microbiological cause likely)"
      : "Concordant, resolved";
  } else if (rsi === "I") {
    // Intermediate is deliberately NOT folded into "susceptible" — clinically
    // it means the drug may still work at a higher dose or with better local
    // penetration, not that the isolate is fully susceptible. Conflating S
    // and I under one "susceptible" bucket overstates confidence and (as
    // found in review) inflates "clinical failure despite susceptible
    // organism" counts with cases that were never really susceptible.
    const outcome = String(row.outcome || "").toLowerCase();
    const failed = /fail|reoperat|readmit|worsen|no improvement|persist/.test(outcome);
    concordance = failed
      ? "Intermediate susceptibility, clinical failure (consider dose/route optimization)"
      : "Intermediate susceptibility, resolved";
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
function normalizeExactLabel(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ");
}

// organismGrouping: "standardized" (default) rolls up to the canonical
// taxonomy entry (e.g. Fusarium solani -> Fusarium species) for a usable
// cumulative antibiogram, but tracks which raw species-level names were
// folded into each row so that information isn't silently lost — each row
// carries an `organismVariants` list of distinct raw names observed,
// rendered as e.g. "Fusarium species (incl. Fusarium solani)". Setting
// organismGrouping to "exact" instead groups by the raw entered text
// verbatim, so species-level distinctions are never merged at all — useful
// when a user wants to audit exactly what was in their original data.
export function buildAntibiogram(records, { firstIsolateOnly = true, organismGrouping = "standardized" } = {}) {
  const source = firstIsolateOnly ? getFirstIsolatePerPatient(records) : records;
  const grid = {};
  const variantTracker = {};

  source.forEach((r) => {
    if (r.rsi === "Unknown" || r.organism_code === "NOGROW") return;
    const key = organismGrouping === "exact" ? normalizeExactLabel(r.organism) : r.organism_standardized;
    if (!key) return;
    if (!grid[key]) grid[key] = {};
    const abKey = r.antimicrobial_standardized;
    if (!grid[key][abKey]) grid[key][abKey] = { S: 0, I: 0, R: 0, total: 0 };
    grid[key][abKey][r.rsi] += 1;
    grid[key][abKey].total += 1;

    if (organismGrouping === "standardized") {
      const rawLabel = normalizeExactLabel(r.organism);
      if (rawLabel && rawLabel.toLowerCase() !== key.toLowerCase()) {
        if (!variantTracker[key]) variantTracker[key] = new Set();
        variantTracker[key].add(rawLabel);
      }
    }
  });

  const table = [];
  Object.entries(grid).forEach(([organism, drugs]) => {
    const variants = variantTracker[organism] ? Array.from(variantTracker[organism]).sort() : [];
    Object.entries(drugs).forEach(([antimicrobial, counts]) => {
      table.push({
        organism,
        organismVariants: variants,
        antimicrobial,
        n: counts.total,
        resistantCount: counts.R,
        susceptibleCount: counts.S,
        intermediateCount: counts.I,
        // Rounded values for display. Threshold logic (e.g. "≥30% resistant")
        // must use pctResistantExact, not this rounded figure — otherwise a
        // pair at 29.6% resistance rounds to "30%" on screen and incorrectly
        // trips a >=30% threshold check that should only fire on the real
        // underlying rate. Found via third-party review on a 5,000-record
        // dataset: 4 pairs in the 29.6-29.9% range were being counted as
        // "≥30% resistant" (53 instead of the correct 49) purely because
        // rounding happened before the threshold comparison instead of after.
        pctSusceptible: Math.round(((counts.S) / counts.total) * 100),
        pctResistant: Math.round(((counts.R) / counts.total) * 100),
        pctSusceptibleExact: (counts.S / counts.total) * 100,
        pctResistantExact: (counts.R / counts.total) * 100,
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

  // 1. Discordant empiric therapy cases (resistant organism, drug still
  // given). IMPORTANT: this counts MICROBIOLOGICAL discordance only — the
  // drug given did not match what the culture showed was effective. It does
  // NOT mean the infection necessarily persisted or the patient did poorly;
  // many discordant cases still resolve (partial drug effect, host immune
  // clearance, empiric therapy changed once culture results arrived, etc).
  // A prior version of this flag's own description overstated this
  // ("infection occurred/persisted despite treatment" for the full count),
  // conflating microbiological discordance with clinical failure — caught
  // via third-party review comparing this flag's claim against actual
  // outcome data (893 of 1,360 discordant cases in a real test dataset had
  // resolved). The distinct, higher-confidence clinical-failure subset is
  // reported separately below.
  const discordant = records.filter((r) => r.concordance.startsWith("Discordant"));
  if (discordant.length > 0) {
    flags.push({
      severity: "high",
      title: `${discordant.length} case(s) of discordant empiric therapy`,
      detail: "Antibiotic given was resistant per culture (microbiological discordance) — this reflects empiric-therapy accuracy against the culture result, not necessarily clinical outcome. See the separate 'resistant therapy with non-resolved outcome' flag below for the subset where this also coincided with treatment failure.",
      records: discordant,
    });
  }

  // 1b. Resistant AND clinically non-resolved — the clearer, more
  // clinically meaningful signal that a resistant empiric choice actually
  // contributed to a poor outcome, rather than just being microbiologically
  // mismatched. This is the subset of (1) above worth the most scrutiny.
  const resistantAndFailed = discordant.filter((r) => {
    const outcome = String(r.outcome || "").toLowerCase();
    return /fail|reoperat|readmit|worsen|no improvement|persist/.test(outcome);
  });
  if (resistantAndFailed.length > 0) {
    flags.push({
      severity: "high",
      title: `${resistantAndFailed.length} case(s) of resistant therapy with non-resolved outcome`,
      detail: "Of the discordant cases above, these specifically had a non-resolved outcome (treatment failure, reoperation, persistence, readmission) — the clearest evidence in this dataset that a resistant empiric choice contributed to a poor clinical outcome, distinct from microbiological discordance alone.",
      records: resistantAndFailed,
    });
  }

  // 2. Concordant but clinically failed (non-microbiological failure) —
  // Sensitive-only, per the flag's own title ("...despite susceptible
  // organism"). Intermediate is tracked as its own, separately-worded flag
  // below, since folding it into "susceptible" overstates what the lab
  // result actually showed.
  const concordantFail = records.filter((r) => r.concordance.startsWith("Concordant but"));
  if (concordantFail.length > 0) {
    flags.push({
      severity: "medium",
      title: `${concordantFail.length} case(s) of clinical failure despite susceptible organism`,
      detail: "Organism was susceptible to the drug given, but outcome indicates failure — check dosing, route/penetration, adherence, or biofilm/foreign-body source.",
      records: concordantFail,
    });
  }

  // 2b. Intermediate susceptibility with clinical failure — a distinct,
  // less severe signal than true resistance, but also not the same claim as
  // "susceptible organism, unexplained failure". At intermediate MIC, higher
  // dosing or better local penetration may still salvage the drug choice.
  const intermediateFail = records.filter((r) => r.concordance.startsWith("Intermediate susceptibility, clinical failure"));
  if (intermediateFail.length > 0) {
    flags.push({
      severity: "medium",
      title: `${intermediateFail.length} case(s) of clinical failure with intermediate susceptibility`,
      detail: "Organism showed intermediate (not fully susceptible) results, and outcome indicates failure — consider whether a higher dose, more frequent dosing, or a route with better local penetration could still salvage this drug choice before switching classes.",
      records: intermediateFail,
    });
  }

  // 3. Rising resistance per organism-drug pair (needs >= 5 tested to be
  // meaningful). Uses the EXACT (unrounded) resistance rate for the
  // threshold check — comparing against the rounded display value would
  // incorrectly flag pairs just under 30% that only round up to 30% on
  // screen (e.g. 29.63% displaying as "30%").
  const antibiogram = buildAntibiogram(records);
  const highResistance = antibiogram.filter((a) => a.n >= 5 && a.pctResistantExact >= 30);
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
    const highestObserved = rows
      .filter((r) => r.n >= 3)
      .sort((a, b) => b.pctSusceptibleExact - a.pctSusceptibleExact)[0];
    // Uses the exact (unrounded) resistance rate for the threshold, same fix
    // as the flagPatterns high-resistance check — a pair at 29.6% should not
    // trip a ">=30%" alert just because its rounded display value is 30%.
    const worst = rows
      .filter((r) => r.n >= 3 && r.pctResistantExact >= 30)
      .sort((a, b) => b.pctResistantExact - a.pctResistantExact);

    if (highestObserved) {
      // Deliberately NOT phrased as "best empiric coverage" — this is a
      // ranking of tested agents by observed susceptibility in this dataset,
      // not a clinical recommendation. That distinction matters: the drug
      // with the highest number here might have a small n, might not be an
      // appropriate first-line agent for the site/organism, or might simply
      // be the least-bad option among a handful tested. Phrasing it as
      // "best" implies a level of clinical endorsement the underlying
      // ranking doesn't support.
      suggestions.push({
        organism,
        message: `Highest observed susceptibility for ${organism}: ${highestObserved.antimicrobial} (${highestObserved.pctSusceptible}% susceptible, n=${highestObserved.n}) — a data ranking, not a prescribing recommendation.`,
      });
    }
    worst.forEach((w) => {
      suggestions.push({
        organism,
        message: `Resistance alert — ${w.antimicrobial} for ${organism}: ${w.pctResistant}% resistance observed (n=${w.n}).`,
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
