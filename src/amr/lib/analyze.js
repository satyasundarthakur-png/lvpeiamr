import { standardizeOrganism } from "../data/organisms.js";
import { standardizeAntimicrobial } from "../data/antimicrobials.js";

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
    antimicrobial_standardized: antimicrobial.name,
    antimicrobial_class: antimicrobial.class,
    rsi,
    concordance,
  };
}

export function standardizeDataset(rows) {
  return rows.map(standardizeRecord);
}

// Build an antibiogram: organism x antimicrobial -> % susceptible
export function buildAntibiogram(records) {
  const grid = {};
  records.forEach((r) => {
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
