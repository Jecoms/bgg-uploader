import type { CollectionIdentity } from './bgg/collection';

/** Resolve once `predicate` returns a value, polling the DOM; null on timeout. */
export function waitFor<T>(
  predicate: () => T | null,
  timeoutMs = 15000,
  everyMs = 250,
): Promise<T | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const v = predicate();
      if (v !== null) return resolve(v);
      if (Date.now() - started > timeoutMs) return resolve(null);
      setTimeout(tick, everyMs);
    };
    tick();
  });
}

/**
 * The collection page renders the logged-in owner's username/userid as hidden inputs inside
 * the "Add a Game" widget, which only exists when viewing your own collection.
 */
export function readIdentity(doc: Document = document): CollectionIdentity | null {
  const username = doc.querySelector<HTMLInputElement>('input#username')?.value;
  const userid = doc.querySelector<HTMLInputElement>('input#userid')?.value;
  const ownCollection = doc.querySelector('#addgame') !== null;
  if (!username || !userid || !ownCollection) return null;
  return { username, userid };
}

export function isCollectionPage(loc: Location = location): boolean {
  return /^\/collection\/user\//.test(loc.pathname);
}
