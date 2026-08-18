// Small Levenshtein-distance based fuzzy matcher, used as a fallback when
// exact/substring matching fails to recognize a raw uploaded term (e.g. a
// typo like "psuedomonas" or "flouroquinolone"). This is deliberately
// conservative — it only accepts a match within a tight edit-distance
// budget relative to word length, to avoid silently mis-mapping genuinely
// different terms.

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Max allowed edit distance scales with string length so short words (where
// one typo changes meaning) stay strict, while longer clinical terms allow a
// bit more slack.
function maxDistanceFor(len) {
  if (len <= 4) return 0; // too short to safely fuzzy-match
  if (len <= 7) return 1;
  if (len <= 12) return 2;
  return 3;
}

// Finds the best fuzzy match for `raw` among a flat list of { value, ref }
// candidates (value = comparable lowercase string, ref = the object to
// return on match). Returns null if nothing is within the allowed distance.
export function fuzzyBestMatch(raw, candidates) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return null;

  let best = null;
  let bestDist = Infinity;

  for (const { value, ref } of candidates) {
    if (!value) continue;
    const budget = maxDistanceFor(Math.max(t.length, value.length));
    // Quick length-based skip before running full Levenshtein for speed.
    if (Math.abs(t.length - value.length) > budget) continue;
    const dist = levenshtein(t, value);
    if (dist <= budget && dist < bestDist) {
      bestDist = dist;
      best = ref;
    }
  }
  return best;
}
