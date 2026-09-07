<script lang="ts">
import type { CollectionIdentity } from '../lib/bgg/collection';
import { Importer } from '../lib/importer.svelte';
import Panel from './Panel.svelte';

let { identity }: { identity: CollectionIdentity } = $props();
let open = $state(false);
// svelte-ignore state_referenced_locally -- identity is fixed for the page's lifetime
const importer = new Importer(identity);
</script>

{#if open}
  <Panel {importer} onclose={() => (open = false)} />
{:else}
  <button type="button" class="fab" onclick={() => (open = true)}>Bulk update collection</button>
{/if}

<style>
  .fab {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 2147483000;
    font: 14px system-ui, sans-serif;
    padding: 0.6rem 1rem;
    border-radius: 999px;
    border: none;
    background: #1f5fbf;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
</style>
