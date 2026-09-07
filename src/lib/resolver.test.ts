import { describe, expect, it } from 'vitest';
import type { SearchHit } from './bgg/search';
import {
  chooseCandidate,
  mergeSettled,
  resolveAll,
  resolvedGames,
  skipRow,
  unsettledCount,
} from './resolver';
import { at } from './test-utils';

const hit = (objectid: number, name: string, year = 2000): SearchHit => ({ objectid, name, year });
const db: Record<string, SearchHit[]> = {
  Dominion: [hit(36218, 'Dominion', 2008), hit(1, 'Dominion: Intrigue', 2009)],
  Catan: [hit(13, 'Catan', 1995), hit(14, 'Catan', 2015)],
  Nothing: [],
  Boom: [],
};

describe('resolveAll', () => {
  it('classifies each name and reports progress', async () => {
    const updates: number[] = [];
    const rows = await resolveAll(
      ['Dominion', 'Catan', 'Nothing', 'Boom'],
      {
        search: async (q) => {
          if (q === 'Boom') throw new Error('kaboom');
          return db[q] ?? [];
        },
        sleep: async () => {},
      },
      (r) => updates.push(r.filter((x) => x.status.kind !== 'pending').length),
    );
    expect(rows.map((r) => r.status.kind)).toEqual(['resolved', 'ambiguous', 'none', 'error']);
    expect(updates.at(-1)).toBe(4);
    expect(resolvedGames(rows)).toEqual([
      { input: 'Dominion', objectid: 36218, name: 'Dominion', year: 2008 },
    ]);
    expect(unsettledCount(rows)).toBe(1);
  });

  it('stops when aborted', async () => {
    const ctl = new AbortController();
    let n = 0;
    const rows = await resolveAll(
      ['Dominion', 'Catan'],
      {
        search: async (q) => {
          n++;
          ctl.abort();
          return db[q] ?? [];
        },
        sleep: async () => {},
        signal: ctl.signal,
      },
      () => {},
    );
    expect(n).toBe(1);
    expect(at(rows, 1).status.kind).toBe('pending');
  });
});

describe('chooseCandidate / skipRow', () => {
  it('settles an ambiguous row', () => {
    const row = {
      input: 'Catan',
      status: { kind: 'ambiguous' as const, candidates: db.Catan ?? [] },
    };
    const chosen = chooseCandidate(row, hit(14, 'Catan', 2015));
    expect(chosen.status).toMatchObject({ kind: 'resolved', chosen: true, game: { objectid: 14 } });
    expect(skipRow(row).status).toEqual({ kind: 'skipped' });
  });
});

describe('mergeSettled', () => {
  const ambiguous = {
    input: 'Catan',
    status: { kind: 'ambiguous' as const, candidates: db.Catan ?? [] },
  };
  const pending = { input: 'Dominion', status: { kind: 'pending' as const } };

  it('keeps rows the user already picked or skipped when a new snapshot arrives', () => {
    const current = [chooseCandidate(ambiguous, hit(14, 'Catan', 2015)), skipRow(pending)];
    const incoming = [ambiguous, { input: 'Dominion', status: { kind: 'searching' as const } }];
    const merged = mergeSettled(current, incoming);
    expect(merged[0]).toBe(current[0]);
    expect(merged[1]).toBe(current[1]);
  });

  it('takes incoming rows the user has not touched', () => {
    const merged = mergeSettled(
      [ambiguous, pending],
      [ambiguous, { input: 'Dominion', status: { kind: 'none' as const } }],
    );
    expect(merged[1]?.status.kind).toBe('none');
  });

  it('does not keep a settled row if the input at that index changed', () => {
    const merged = mergeSettled(
      [skipRow(pending)],
      [{ input: 'Other', status: { kind: 'pending' as const } }],
    );
    expect(merged[0]?.status.kind).toBe('pending');
  });
});
