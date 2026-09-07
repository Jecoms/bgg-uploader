import { describe, expect, it } from 'vitest';
import type { PlanItem } from './plan';
import { runPlan } from './runner';

const game = (objectid: number) => ({
  input: `g${objectid}`,
  objectid,
  name: `g${objectid}`,
  year: null,
});
const items: PlanItem[] = [
  { game: game(1), rows: [], enabled: true, action: { kind: 'add', flags: { own: true } } },
  {
    game: game(2),
    rows: [],
    enabled: true,
    action: { kind: 'mark-owned', collid: 77, current: {}, next: { own: true } },
  },
  { game: game(3), rows: [], enabled: false, action: { kind: 'skip', reason: 'already-owned' } },
  { game: game(4), rows: [], enabled: false, action: { kind: 'add', flags: { own: true } } },
];

describe('runPlan', () => {
  it('runs enabled items in order and skips the rest', async () => {
    const log: string[] = [];
    const result = await runPlan(
      items,
      {
        addItem: async (id) => {
          log.push(`add ${id}`);
        },
        saveStatus: async (collid, id) => {
          log.push(`save ${collid} ${id}`);
        },
        sleep: async () => {},
      },
      () => {},
    );
    expect(log).toEqual(['add 1', 'save 77 2']);
    expect(result.outcomes.map((o) => o.kind)).toEqual(['done', 'done', 'skipped', 'skipped']);
    expect(result).toMatchObject({ completed: 2, total: 2 });
  });

  it('records failures and keeps going', async () => {
    const result = await runPlan(
      items,
      {
        addItem: async () => {
          throw new Error('nope');
        },
        saveStatus: async () => {},
        sleep: async () => {},
      },
      () => {},
    );
    expect(result.outcomes[0]).toEqual({ kind: 'failed', message: 'nope' });
    expect(result.outcomes[1]).toEqual({ kind: 'done' });
  });

  it('marks remaining items aborted when the signal fires', async () => {
    const ctl = new AbortController();
    const result = await runPlan(
      items,
      {
        addItem: async () => {
          ctl.abort();
        },
        saveStatus: async () => {},
        sleep: async () => {},
        signal: ctl.signal,
      },
      () => {},
    );
    expect(result.outcomes.map((o) => o.kind)).toEqual(['done', 'aborted', 'skipped', 'skipped']);
  });
});
