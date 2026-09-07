import {
  type CollectionIdentity,
  type CollectionRow,
  indexByObjectId,
  readCollection,
} from './bgg/collection';
import { searchGames } from './bgg/search';
import { addItem, saveStatus } from './bgg/status';
import { parseNames } from './parse';
import { buildPlan, type OwnedPolicy, type PlanItem, summarizePlan } from './plan';
import {
  chooseCandidate,
  mergeSettled,
  type ResolveRow,
  resolveAll,
  resolvedGames,
  skipRow,
  unsettledCount,
} from './resolver';
import { type RunProgress, runPlan } from './runner';

export type Stage = 'input' | 'resolving' | 'review' | 'importing' | 'done';

/** All UI state for one import session, as Svelte 5 runes. */
export class Importer {
  stage = $state<Stage>('input');
  input = $state('');
  rows = $state<ResolveRow[]>([]);
  collection = $state<CollectionRow[] | null>(null);
  collectionProgress = $state('');
  plan = $state<PlanItem[]>([]);
  ownedPolicy = $state<OwnedPolicy>('replace');
  progress = $state<RunProgress | null>(null);
  error = $state<string | null>(null);

  names = $derived(parseNames(this.input));
  unsettled = $derived(unsettledCount(this.rows));
  summary = $derived(summarizePlan(this.plan));

  #abort: AbortController | null = null;

  constructor(readonly identity: CollectionIdentity) {}

  async start() {
    this.error = null;
    this.stage = 'resolving';
    this.#abort = new AbortController();
    const signal = this.#abort.signal;
    try {
      const collectionTask = this.#loadCollection();
      await resolveAll(this.names, { search: (q) => searchGames(q), signal }, (rows) => {
        this.rows = mergeSettled(this.rows, rows);
      });
      await collectionTask;
      if (!signal.aborted && this.unsettled === 0) this.review();
    } catch (e) {
      this.fail(e);
    }
  }

  async #loadCollection() {
    if (this.collection) return;
    this.collectionProgress = 'Reading your collection…';
    const rows = await readCollection(this.identity, {}, (page) => {
      this.collectionProgress = `Read ${page.to} of ${page.total} collection items…`;
    });
    this.collection = rows;
    this.collectionProgress = `${rows.length} items in your collection`;
  }

  choose(index: number, objectid: number) {
    const row = this.rows[index];
    if (row?.status.kind !== 'ambiguous') return;
    const hit = row.status.candidates.find((c) => c.objectid === objectid);
    if (hit) this.rows[index] = chooseCandidate(row, hit);
  }

  skip(index: number) {
    const row = this.rows[index];
    if (row) this.rows[index] = skipRow(row);
  }

  review() {
    if (!this.collection) return;
    this.plan = buildPlan(resolvedGames(this.rows), indexByObjectId(this.collection), {
      ownedPolicy: this.ownedPolicy,
    });
    this.stage = 'review';
  }

  setPolicy(policy: OwnedPolicy) {
    this.ownedPolicy = policy;
    if (this.stage === 'review') this.review();
  }

  toggle(index: number, enabled: boolean) {
    const item = this.plan[index];
    if (item && item.action.kind !== 'skip') this.plan[index] = { ...item, enabled };
  }

  async run() {
    this.stage = 'importing';
    this.#abort = new AbortController();
    try {
      this.progress = await runPlan(
        this.plan,
        { addItem, saveStatus, signal: this.#abort.signal },
        (p) => {
          this.progress = p;
        },
      );
      this.stage = 'done';
    } catch (e) {
      this.fail(e);
    }
  }

  cancel() {
    this.#abort?.abort();
  }

  reset() {
    this.cancel();
    this.stage = 'input';
    this.rows = [];
    this.plan = [];
    this.progress = null;
    this.error = null;
    this.collection = null;
  }

  private fail(e: unknown) {
    this.error = e instanceof Error ? e.message : String(e);
  }
}
