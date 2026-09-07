import type { StatusFlags } from './bgg/status';
import type { PlanItem } from './plan';

export interface RunnerDeps {
  addItem: (objectid: number, flags: StatusFlags) => Promise<void>;
  saveStatus: (collid: number, objectid: number, flags: StatusFlags) => Promise<unknown>;
  /** Pause between writes; default 750ms. */
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

export type ItemOutcome =
  | { kind: 'pending' }
  | { kind: 'running' }
  | { kind: 'done' }
  | { kind: 'skipped' }
  | { kind: 'failed'; message: string }
  | { kind: 'aborted' };

export interface RunProgress {
  outcomes: ItemOutcome[];
  completed: number;
  total: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Execute the enabled plan items one at a time, reporting progress after each. */
export async function runPlan(
  items: PlanItem[],
  deps: RunnerDeps,
  onProgress: (p: RunProgress) => void,
): Promise<RunProgress> {
  const sleep = deps.sleep ?? defaultSleep;
  const delay = deps.delayMs ?? 750;
  const outcomes: ItemOutcome[] = items.map((it) =>
    it.enabled && it.action.kind !== 'skip' ? { kind: 'pending' } : { kind: 'skipped' },
  );
  const total = outcomes.filter((o) => o.kind === 'pending').length;
  let completed = 0;
  const report = () => onProgress({ outcomes: [...outcomes], completed, total });
  report();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || outcomes[i]?.kind !== 'pending') continue;
    if (deps.signal?.aborted) {
      outcomes[i] = { kind: 'aborted' };
      continue;
    }
    outcomes[i] = { kind: 'running' };
    report();
    try {
      await execute(item, deps);
      outcomes[i] = { kind: 'done' };
    } catch (e) {
      outcomes[i] = { kind: 'failed', message: e instanceof Error ? e.message : String(e) };
    }
    completed++;
    report();
    if (completed < total && !deps.signal?.aborted) await sleep(delay);
  }
  return { outcomes, completed, total };
}

async function execute(item: PlanItem, deps: RunnerDeps): Promise<void> {
  const { action, game } = item;
  switch (action.kind) {
    case 'add':
      await deps.addItem(game.objectid, action.flags);
      return;
    case 'mark-owned':
      await deps.saveStatus(action.collid, game.objectid, action.next);
      return;
    case 'skip':
      return;
  }
}
