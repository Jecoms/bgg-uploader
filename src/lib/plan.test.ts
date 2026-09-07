import { describe, expect, it } from 'vitest';
import type { CollectionRow } from './bgg/collection';
import { indexByObjectId } from './bgg/collection';
import { buildPlan, summarizePlan } from './plan';
import { at } from './test-utils';

const row = (
  collid: number,
  objectid: number,
  status: CollectionRow['status'] = {},
): CollectionRow => ({
  collid,
  objectid,
  name: `game ${objectid}`,
  year: 2000,
  status,
});
const game = (objectid: number, input = `game ${objectid}`) => ({
  input,
  objectid,
  name: input,
  year: 2000,
});

const collection = indexByObjectId([
  row(10, 1, { own: true }),
  row(11, 2, { wanttoplay: true, wanttobuy: true }),
  row(12, 3),
  row(13, 4, { wishlist: true, wishlistpriority: 2 }),
  row(14, 4, { own: true }),
]);

describe('buildPlan', () => {
  it('skips games already owned, including when any version row is owned', () => {
    const plan = buildPlan([game(1), game(4)], collection);
    expect(plan.map((p) => p.action.kind)).toEqual(['skip', 'skip']);
    expect(plan.every((p) => !p.enabled)).toBe(true);
  });

  it('marks existing non-owned rows as owned, replacing flags by default', () => {
    const p = at(buildPlan([game(2)], collection), 0);
    expect(p.action).toEqual({
      kind: 'mark-owned',
      collid: 11,
      current: { wanttoplay: true, wanttobuy: true },
      next: { own: true },
    });
    expect(p.enabled).toBe(true);
  });

  it('can keep existing flags when marking owned', () => {
    const p = at(buildPlan([game(2)], collection, { ownedPolicy: 'keep-flags' }), 0);
    expect(p.action).toMatchObject({ next: { own: true, wanttoplay: true, wanttobuy: true } });
  });

  it('marks a status-less existing row instead of adding a duplicate', () => {
    const p = at(buildPlan([game(3)], collection), 0);
    expect(p.action).toMatchObject({ kind: 'mark-owned', collid: 12 });
  });

  it('adds games not in the collection as owned', () => {
    const p = at(buildPlan([game(99)], collection), 0);
    expect(p.action).toEqual({ kind: 'add', flags: { own: true } });
  });

  it('skips repeated object ids within the input', () => {
    const plan = buildPlan([game(99, 'Foo'), game(99, 'foo (2nd ed)')], collection);
    expect(at(plan, 1).action).toEqual({ kind: 'skip', reason: 'duplicate-input' });
  });

  it('summarizes', () => {
    const plan = buildPlan([game(1), game(2), game(99), game(99)], collection);
    expect(summarizePlan(plan)).toEqual({
      add: 1,
      markOwned: 1,
      alreadyOwned: 1,
      duplicate: 1,
      enabled: 2,
    });
  });
});
