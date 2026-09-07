<script lang="ts">
import type { Importer } from '../lib/importer.svelte';
import Picker from './Picker.svelte';

let { importer, onclose }: { importer: Importer; onclose: () => void } = $props();

const actionLabel = (kind: string, reason?: string) =>
  kind === 'add'
    ? 'Add as owned'
    : kind === 'mark-owned'
      ? 'Mark owned'
      : reason === 'already-owned'
        ? 'Already owned'
        : 'Duplicate';

const flagText = (f: Record<string, unknown>) =>
  Object.entries(f)
    .filter(([k, v]) => v === true && k !== 'wishlistpriority')
    .map(([k]) => k)
    .join(', ') || 'none';
</script>

<aside class="panel">
  <header>
    <h2>Bulk update collection</h2>
    <span class="muted">for {importer.identity.username}</span>
    <button type="button" class="close" onclick={onclose} aria-label="Close">×</button>
  </header>

  {#if importer.error}
    <p class="error">{importer.error}</p>
  {/if}

  {#if importer.stage === 'input'}
    <p>Paste game names, one per line. Each will be looked up on BGG and either added as owned or, if it is already in your collection, marked as owned.</p>
    <textarea bind:value={importer.input} rows="14" placeholder="Catan&#10;Wingspan&#10;Ark Nova"></textarea>
    <footer>
      <span>{importer.names.length} {importer.names.length === 1 ? 'game' : 'games'}</span>
      <button type="button" class="primary" disabled={importer.names.length === 0} onclick={() => importer.start()}>
        Look up games
      </button>
    </footer>

  {:else if importer.stage === 'resolving'}
    <p class="muted">{importer.collectionProgress}</p>
    <ol class="rows">
      {#each importer.rows as row, i (row.input)}
        <li>
          {#if row.status.kind === 'ambiguous'}
            <Picker
              input={row.input}
              candidates={row.status.candidates}
              onchoose={(id) => importer.choose(i, id)}
              onskip={() => importer.skip(i)}
            />
          {:else}
            <span class="name">{row.input}</span>
            <span class="status {row.status.kind}">
              {#if row.status.kind === 'resolved'}
                → {row.status.game.name}{row.status.game.year ? ` (${row.status.game.year})` : ''}
                {#if !row.status.exact}<span class="muted">(closest match)</span>{/if}
              {:else if row.status.kind === 'none'}
                no match on BGG
              {:else if row.status.kind === 'error'}
                error: {row.status.message}
              {:else}
                {row.status.kind}
              {/if}
            </span>
          {/if}
        </li>
      {/each}
    </ol>
    <footer>
      <button type="button" onclick={() => importer.reset()}>Cancel</button>
      <button
        type="button"
        class="primary"
        disabled={importer.unsettled > 0 || !importer.collection}
        onclick={() => importer.review()}
      >
        {importer.unsettled > 0 ? `${importer.unsettled} to settle` : 'Review'}
      </button>
    </footer>

  {:else if importer.stage === 'review'}
    <p>
      <strong>{importer.summary.add}</strong> to add,
      <strong>{importer.summary.markOwned}</strong> to mark owned,
      <strong>{importer.summary.alreadyOwned}</strong> already owned,
      <strong>{importer.summary.duplicate}</strong> duplicates.
    </p>
    <label class="policy">
      When marking an existing entry as owned:
      <select value={importer.ownedPolicy} onchange={(e) => importer.setPolicy(e.currentTarget.value as 'replace' | 'keep-flags')}>
        <option value="replace">Replace its other statuses (e.g. drop Want to Buy)</option>
        <option value="keep-flags">Keep its other statuses and add Owned</option>
      </select>
    </label>
    <table>
      <thead><tr><th></th><th>Game</th><th>Action</th><th>Current</th></tr></thead>
      <tbody>
        {#each importer.plan as item, i (item.game.objectid + item.game.input)}
          <tr class:disabled={!item.enabled}>
            <td>
              <input
                type="checkbox"
                checked={item.enabled}
                disabled={item.action.kind === 'skip'}
                onchange={(e) => importer.toggle(i, e.currentTarget.checked)}
              />
            </td>
            <td>
              <a href={`https://boardgamegeek.com/boardgame/${item.game.objectid}`} target="_blank" rel="noreferrer">{item.game.name}</a>
              {#if item.game.year}<span class="muted">({item.game.year})</span>{/if}
              {#if item.game.input.toLowerCase() !== item.game.name.toLowerCase()}
                <div class="muted small">from "{item.game.input}"</div>
              {/if}
            </td>
            <td>{actionLabel(item.action.kind, item.action.kind === 'skip' ? item.action.reason : undefined)}</td>
            <td class="muted small">
              {item.action.kind === 'mark-owned' ? flagText(item.action.current) : item.rows.length ? 'in collection' : '—'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <footer>
      <button type="button" onclick={() => importer.reset()}>Start over</button>
      <button type="button" class="primary" disabled={importer.summary.enabled === 0} onclick={() => importer.run()}>
        Import {importer.summary.enabled} {importer.summary.enabled === 1 ? 'game' : 'games'}
      </button>
    </footer>

  {:else if importer.stage === 'importing' || importer.stage === 'done'}
    {@const p = importer.progress}
    {#if p}
      <progress max={p.total} value={p.completed}></progress>
      <p>{p.completed} of {p.total} {importer.stage === 'done' ? 'processed' : 'so far'}</p>
      <ol class="rows">
        {#each importer.plan as item, i (item.game.objectid + item.game.input)}
          {@const o = p.outcomes[i]}
          {#if o && o.kind !== 'skipped'}
            <li>
              <span class="name">{item.game.name}</span>
              <span class="status {o.kind}">{o.kind === 'failed' ? `failed: ${o.message}` : o.kind}</span>
            </li>
          {/if}
        {/each}
      </ol>
    {/if}
    <footer>
      {#if importer.stage === 'importing'}
        <button type="button" onclick={() => importer.cancel()}>Stop</button>
      {:else}
        <button type="button" onclick={() => importer.reset()}>Import more</button>
        <button type="button" class="primary" onclick={() => location.reload()}>Reload collection</button>
      {/if}
    </footer>
  {/if}
</aside>

<style>
  .panel {
    --border: #c9c9c9;
    --accent: #1f5fbf;
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: min(520px, 100vw);
    background: #fff;
    color: #222;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    font: 14px/1.4 system-ui, sans-serif;
    box-sizing: border-box;
    padding: 1rem;
    overflow: auto;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0;
  }
  .close {
    margin-left: auto;
    font-size: 1.4rem;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
  }
  footer {
    margin-top: auto;
    padding-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    align-items: center;
  }
  footer span {
    margin-right: auto;
  }
  button {
    font: inherit;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #f4f4f4;
    cursor: pointer;
  }
  button.primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .rows {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.25rem;
  }
  .rows li {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    border-bottom: 1px solid #eee;
    padding: 0.2rem 0;
  }
  .status.none,
  .status.error,
  .status.failed {
    color: #b00020;
  }
  .status.resolved,
  .status.done {
    color: #1a7f37;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  tr.disabled td {
    opacity: 0.5;
  }
  .policy {
    display: grid;
    gap: 0.25rem;
    margin: 0.5rem 0;
  }
  select {
    font: inherit;
  }
  .muted {
    opacity: 0.7;
  }
  .small {
    font-size: 0.85em;
  }
  .error {
    color: #b00020;
  }
  progress {
    width: 100%;
  }
</style>
