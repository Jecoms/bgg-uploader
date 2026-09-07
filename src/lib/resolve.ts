import type { SearchHit } from './bgg/search';

export type Resolution =
  | { kind: 'resolved'; hit: SearchHit; exact: boolean }
  | { kind: 'ambiguous'; candidates: SearchHit[] }
  | { kind: 'none' };

/** Normalize a title for comparison: case, punctuation, articles, whitespace. */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[‘’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^(the|a|an) /, '')
    .replace(/ (the|a|an)$/, '')
    .trim();
}

/**
 * Decide what a search for `name` resolved to.
 * - one exact title match (normalized) -> resolved
 * - several exact matches (reprints) -> ambiguous among those
 * - no exact match but exactly one hit -> resolved, flagged inexact
 * - otherwise ambiguous among all hits, or none
 */
export function resolveHits(name: string, hits: SearchHit[]): Resolution {
  if (hits.length === 0) return { kind: 'none' };
  const target = normalizeTitle(name);
  const exact = hits.filter((h) => normalizeTitle(h.name) === target);
  const [onlyExact] = exact;
  const [onlyHit] = hits;
  if (onlyExact && exact.length === 1) return { kind: 'resolved', hit: onlyExact, exact: true };
  if (exact.length > 1) return { kind: 'ambiguous', candidates: sortByYearDesc(exact) };
  if (onlyHit && hits.length === 1) return { kind: 'resolved', hit: onlyHit, exact: false };
  return { kind: 'ambiguous', candidates: sortByYearDesc(hits) };
}

function sortByYearDesc(hits: SearchHit[]): SearchHit[] {
  return [...hits].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
