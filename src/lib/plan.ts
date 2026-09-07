import type { CollectionRow } from './bgg/collection';
import { hasAnyStatus, type StatusFlags } from './bgg/status';

export interface InputGame {
  /** the name as the user typed it */
  input: string;
  objectid: number;
  /** resolved display name */
  name: string;
  year: number | null;
}

export type PlanAction =
  | { kind: 'add'; flags: StatusFlags }
  | { kind: 'mark-owned'; collid: number; current: StatusFlags; next: StatusFlags }
  | { kind: 'skip'; reason: 'already-owned' | 'duplicate-input' };

export interface PlanItem {
  game: InputGame;
  action: PlanAction;
  /** existing rows for this game, if any */
  rows: CollectionRow[];
  /** user can untick an item in the review table */
  enabled: boolean;
}

export type OwnedPolicy = 'replace' | 'keep-flags';

export interface PlanOptions {
  /** How to mark an existing non-owned row as owned. Default: replace. */
  ownedPolicy?: OwnedPolicy;
}

/**
 * Decide, per input game, whether to add a new row, flip an existing row to owned, or skip.
 * Keyed strictly by objectid against the freshly read collection.
 */
export function buildPlan(
  games: InputGame[],
  collection: Map<number, CollectionRow[]>,
  opts: PlanOptions = {},
): PlanItem[] {
  const policy = opts.ownedPolicy ?? 'replace';
  const seen = new Set<number>();
  return games.map((game) => {
    const rows = collection.get(game.objectid) ?? [];
    if (seen.has(game.objectid)) {
      return { game, rows, enabled: false, action: { kind: 'skip', reason: 'duplicate-input' } };
    }
    seen.add(game.objectid);

    if (rows.some((r) => r.status.own)) {
      return { game, rows, enabled: false, action: { kind: 'skip', reason: 'already-owned' } };
    }
    if (rows.length > 0) {
      const target = pickRowToMark(rows);
      const next: StatusFlags =
        policy === 'keep-flags' ? { ...target.status, own: true } : { own: true };
      return {
        game,
        rows,
        enabled: true,
        action: { kind: 'mark-owned', collid: target.collid, current: target.status, next },
      };
    }
    return { game, rows, enabled: true, action: { kind: 'add', flags: { own: true } } };
  });
}

/** Prefer a row that already carries some status (it's the one the user curated). */
function pickRowToMark(rows: CollectionRow[]): CollectionRow {
  const row = rows.find((r) => hasAnyStatus(r.status)) ?? rows[0];
  if (!row) throw new Error('pickRowToMark called with no rows');
  return row;
}

export function summarizePlan(items: PlanItem[]) {
  const s = { add: 0, markOwned: 0, alreadyOwned: 0, duplicate: 0, enabled: 0 };
  for (const it of items) {
    if (it.enabled) s.enabled++;
    switch (it.action.kind) {
      case 'add':
        s.add++;
        break;
      case 'mark-owned':
        s.markOwned++;
        break;
      case 'skip':
        if (it.action.reason === 'already-owned') s.alreadyOwned++;
        else s.duplicate++;
    }
  }
  return s;
}
