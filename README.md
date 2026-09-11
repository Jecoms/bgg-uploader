# BGG Collection Uploader

A browser extension for Firefox and Chrome that bulk-updates your
[BoardGameGeek](https://boardgamegeek.com) collection from a list of game names.
BGG has no import feature of its own.

**Install:**
[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/bgg-collection-uploader/) ·
[Chrome Web Store](https://chromewebstore.google.com/detail/omkcggagkcljmaomlcejeejgbadjopad)

It runs inside your own logged-in BGG tab, so it never handles your password and
never needs an API key.

## What it does

1. Open your own collection page on BGG while logged in. A **Bulk update collection**
   button appears in the bottom-right corner.
2. Paste game names, one per line (semicolons work too).
3. Each name is looked up with BGG's own search. Exact matches resolve on their own;
   ambiguous ones (reprints, editions) show a picker; misses are flagged.
4. A review table shows what will happen to each game, keyed by BGG id against a fresh
   read of your whole collection:
   - **Add as owned** if it is not in your collection.
   - **Mark owned** if it is already there under another status (wishlist, want to play,
     no status). You choose whether to replace those statuses or keep them and add Owned.
   - **Already owned** is skipped, including when any version of the game is owned.
5. Import runs one request at a time with a short pause, shows progress, and lists
   anything that failed.

## Why an extension?

- BGG's XML API is read-only and now requires a registered application token.
- BGG's website API is private; its terms grant no license for third-party clients.
- BGG sits behind a Cloudflare challenge that blocks headless and automated browsers.

The only place a tool can legitimately act on your collection is your own browser session.
The endpoints the extension uses are the same form posts the collection page itself makes;
they are documented in [docs/bgg-endpoints.md](docs/bgg-endpoints.md).

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev            # Chrome with hot reload
bun run dev:firefox    # Firefox via web-ext (fresh profile; log in to BGG there)
bun run build          # .output/chrome-mv3
bun run build:firefox  # .output/firefox-mv2
bun run check          # svelte-check
bun run lint           # Biome
bun run test           # Vitest unit tests (parsers run against captured BGG responses)
bun run test:e2e       # build, then Playwright against the built extension
bun run icons          # regenerate public/icon/*.png from assets/icon.svg
```

To load into your own browser:
Chrome → `chrome://extensions` → Developer mode → Load
unpacked → `.output/chrome-mv3`.
Firefox → `about:debugging` → This Firefox → Load Temporary
Add-on → `.output/firefox-mv2/manifest.json`.

### Layout

```
src/entrypoints/collection.content.ts  content script: injects the launcher on /collection/user/*
src/entrypoints/popup/                 toolbar popup (points you at your collection page)
src/components/                        Svelte UI: Launcher, Panel, Picker
src/lib/importer.svelte.ts             session state machine (input → resolving → review → importing → done)
src/lib/bgg/                           BGG clients + parsers: search, collection read, add, status edit
src/lib/resolve.ts, resolver.ts        name → BGG id matching
src/lib/plan.ts                        add / mark-owned / skip decisions
src/lib/runner.ts                      sequential executor with progress and abort
src/lib/bgg/__fixtures__/              real BGG responses (anonymized) used by the tests
```

Stack: [WXT](https://wxt.dev) + Svelte 5 + TypeScript, Vitest, Playwright, Biome.

## Privacy

Runs only on your own BoardGameGeek collection page, talks only to boardgamegeek.com with the
session you are already logged in with, and stores or sends nothing anywhere else.
Full statement: [PRIVACY.md](PRIVACY.md).

## Status

Published on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/bgg-collection-uploader/)
and the [Chrome Web Store](https://chromewebstore.google.com/detail/omkcggagkcljmaomlcejeejgbadjopad).
Both builds come from the same source and are exercised in CI.

## License

[MIT](LICENSE)
