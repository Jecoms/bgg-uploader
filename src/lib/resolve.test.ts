import { describe, expect, it } from 'vitest';
import { normalizeTitle, resolveHits } from './resolve';

const hit = (objectid: number, name: string, year: number | null = 2000) => ({
  objectid,
  name,
  year,
});

describe('normalizeTitle', () => {
  it('ignores case, punctuation, leading articles and ampersands', () => {
    expect(normalizeTitle('The Castles of Burgundy')).toBe('castles of burgundy');
    expect(normalizeTitle('Dune: Imperium')).toBe('dune imperium');
    expect(normalizeTitle('Ticket to Ride & Friends')).toBe('ticket to ride and friends');
    expect(normalizeTitle("Tzolk'in")).toBe('tzolkin');
  });
});

describe('resolveHits', () => {
  it('returns none for no hits', () => {
    expect(resolveHits('x', [])).toEqual({ kind: 'none' });
  });

  it('resolves a single exact match among many', () => {
    const hits = [hit(1, 'Dune: Imperium', 2020), hit(2, 'Dominion', 2008), hit(3, 'Dune', 1979)];
    expect(resolveHits('dominion', hits)).toEqual({ kind: 'resolved', hit: hits[1], exact: true });
  });

  it('is ambiguous when several exact matches exist, newest first', () => {
    const hits = [hit(1, 'Catan', 1995), hit(2, 'Catan', 2015), hit(3, 'Catan: Seafarers', 1997)];
    const r = resolveHits('Catan', hits);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.candidates.map((c) => c.objectid)).toEqual([2, 1]);
  });

  it('accepts a lone inexact hit but flags it', () => {
    expect(resolveHits('Wingspan Europe', [hit(9, 'Wingspan: European Expansion')])).toEqual({
      kind: 'resolved',
      hit: hit(9, 'Wingspan: European Expansion'),
      exact: false,
    });
  });

  it('is ambiguous among all hits when nothing matches exactly', () => {
    const r = resolveHits('Dune', [hit(1, 'Dune: Imperium'), hit(2, 'Dune: War for Arrakis')]);
    expect(r.kind).toBe('ambiguous');
  });
});
