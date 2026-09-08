import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  // Build DOM with createElement instead of innerHTML so the bundle carries no innerHTML
  // assignments (addons.mozilla.org flags them during validation).
  svelte: { vite: { compilerOptions: { fragments: 'tree' } } },
  manifest: ({ browser }) => ({
    name: 'BGG Collection Uploader',
    description: 'Bulk-update your BoardGameGeek collection from a list of game names.',
    homepage_url: 'https://github.com/Jecoms/bgg-uploader',
    host_permissions: ['*://boardgamegeek.com/*'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'bgg-uploader@jecoms.github.io',
          strict_min_version: '140.0',
          // Required for new addons.mozilla.org submissions: this extension collects no data.
          data_collection_permissions: { required: ['none'] },
        },
        // data_collection_permissions arrived in Firefox for Android 142.
        gecko_android: { strict_min_version: '142.0' },
      },
    }),
  }),
});
