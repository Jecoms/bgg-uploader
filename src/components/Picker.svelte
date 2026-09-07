<script lang="ts">
import type { SearchHit } from '../lib/bgg/search';

let {
  input,
  candidates,
  onchoose,
  onskip,
}: {
  input: string;
  candidates: SearchHit[];
  onchoose: (objectid: number) => void;
  onskip: () => void;
} = $props();
</script>

<div class="picker">
  <div class="picker-head">
    <strong>{input}</strong>
    <span class="muted">— which one?</span>
  </div>
  <ul>
    {#each candidates.slice(0, 12) as c (c.objectid)}
      <li>
        <button type="button" onclick={() => onchoose(c.objectid)}>
          {c.name}
          {#if c.year}<span class="muted">({c.year})</span>{/if}
        </button>
        <a href={`https://boardgamegeek.com/boardgame/${c.objectid}`} target="_blank" rel="noreferrer">↗</a>
      </li>
    {/each}
  </ul>
  <button type="button" class="link" onclick={onskip}>None of these, skip it</button>
</div>

<style>
  .picker {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin: 0.25rem 0;
  }
  .picker-head {
    margin-bottom: 0.25rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.2rem;
  }
  li {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  li button {
    flex: 1;
    text-align: left;
  }
  .muted {
    opacity: 0.7;
  }
  .link {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    padding: 0.25rem 0;
  }
</style>
