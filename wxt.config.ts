import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'BGG Uploader',
    description: 'Bulk-update your BoardGameGeek collection from a list of game names.',
    homepage_url: 'https://github.com/Jecoms/bgg-uploader',
    host_permissions: ['*://boardgamegeek.com/*'],
  },
});
