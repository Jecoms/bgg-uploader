<script lang="ts">
const open = () => browser.tabs.create({ url: 'https://boardgamegeek.com/' });
</script>

<main>
  <h1>BGG Uploader</h1>
  <p>Log in to BoardGameGeek and open your collection (My Geek → Collection). A <strong>Bulk update collection</strong> button appears in the bottom-right corner.</p>
  <button type="button" onclick={open}>Open BoardGameGeek</button>
</main>
