import type { SearchHit } from './bgg/search';
import type { InputGame } from './plan';
import { type Resolution, resolveHits } from './resolve';

export type ResolveStatus =
  | { kind: 'pending' }
  | { kind: 'searching' }
  | { kind: 'resolved'; game: InputGame; exact: boolean; chosen: boolean }
  | { kind: 'ambiguous'; candidates: SearchHit[] }
  | { kind: 'none' }
  | { kind: 'skipped' }
  | { kind: 'error'; message: string };

export interface ResolveRow {
  input: string;
  status: ResolveStatus;
}

export interface ResolverDeps {
  search: (query: string) => Promise<SearchHit[]>;
  /** Pause between searches to stay polite; default 400ms. */
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Search every name sequentially and classify the result. Ambiguous and unmatched
 * rows are left for the user to settle via `chooseCandidate` / `skipRow`.
 */
export async function resolveAll(
  names: string[],
  deps: ResolverDeps,
  onUpdate: (rows: ResolveRow[]) => void,
): Promise<ResolveRow[]> {
  const rows: ResolveRow[] = names.map((input) => ({ input, status: { kind: 'pending' } }));
  const sleep = deps.sleep ?? defaultSleep;
  const delay = deps.delayMs ?? 400;
  onUpdate(rows);

  for (let i = 0; i < rows.length; i++) {
    if (deps.signal?.aborted) break;
    const row = rows[i];
    if (!row) continue;
    rows[i] = { ...row, status: { kind: 'searching' } };
    onUpdate([...rows]);
    try {
      const hits = await deps.search(row.input);
      rows[i] = { ...row, status: toStatus(row.input, resolveHits(row.input, hits)) };
    } catch (e) {
      rows[i] = {
        ...row,
        status: { kind: 'error', message: e instanceof Error ? e.message : String(e) },
      };
    }
    onUpdate([...rows]);
    if (i < rows.length - 1) await sleep(delay);
  }
  return rows;
}

function toStatus(input: string, r: Resolution): ResolveStatus {
  switch (r.kind) {
    case 'resolved':
      return { kind: 'resolved', game: toGame(input, r.hit), exact: r.exact, chosen: false };
    case 'ambiguous':
      return { kind: 'ambiguous', candidates: r.candidates };
    case 'none':
      return { kind: 'none' };
  }
}

export function toGame(input: string, hit: SearchHit): InputGame {
  return { input, objectid: hit.objectid, name: hit.name, year: hit.year };
}

export function chooseCandidate(row: ResolveRow, hit: SearchHit): ResolveRow {
  return {
    ...row,
    status: { kind: 'resolved', game: toGame(row.input, hit), exact: false, chosen: true },
  };
}

export function skipRow(row: ResolveRow): ResolveRow {
  return { ...row, status: { kind: 'skipped' } };
}

/** True once the user has acted on a row (picked a candidate or skipped it). */
export function isSettledByUser(row: ResolveRow): boolean {
  return row.status.kind === 'skipped' || (row.status.kind === 'resolved' && row.status.chosen);
}

/**
 * Merge a fresh snapshot from the resolver into the current rows, keeping any row the user
 * already settled. Without this, each search result would overwrite picker choices.
 */
export function mergeSettled(current: ResolveRow[], incoming: ResolveRow[]): ResolveRow[] {
  return incoming.map((row, i) => {
    const cur = current[i];
    return cur && cur.input === row.input && isSettledByUser(cur) ? cur : row;
  });
}

export function resolvedGames(rows: ResolveRow[]): InputGame[] {
  const out: InputGame[] = [];
  for (const r of rows) if (r.status.kind === 'resolved') out.push(r.status.game);
  return out;
}

export function unsettledCount(rows: ResolveRow[]): number {
  return rows.filter((r) => r.status.kind === 'ambiguous').length;
}
