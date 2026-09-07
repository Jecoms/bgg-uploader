import { mount, unmount } from 'svelte';
import Launcher from '../components/Launcher.svelte';
import { isCollectionPage, readIdentity, waitFor } from '../lib/page';

export default defineContentScript({
  matches: ['*://boardgamegeek.com/collection/user/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (!isCollectionPage()) return;
    // The collection table (and the owner's hidden username/userid inputs) load via AJAX.
    const identity = await waitFor(() => readIdentity());
    if (!identity) {
      console.log('[bgg-uploader] not your own collection page (or it did not load); staying idle');
      return;
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'bgg-uploader',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        return mount(Launcher, { target: container, props: { identity } });
      },
      onRemove(app) {
        if (app) unmount(app);
      },
    });
    ui.mount();
  },
});
