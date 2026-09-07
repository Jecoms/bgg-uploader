import { createHash } from 'node:crypto';
import path from 'node:path';
import { type BrowserContext, test as base, chromium } from '@playwright/test';

const extensionPath = path.resolve(import.meta.dirname, '../.output/chrome-mv3');

/**
 * Chrome derives an unpacked extension's id from its absolute path:
 * first 32 hex chars of sha256(path), with 0-9a-f mapped onto a-p.
 * Computing it avoids needing a background service worker just to read the id.
 */
function unpackedExtensionId(dir: string): string {
  const hex = createHash('sha256').update(dir).digest('hex').slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + Number.parseInt(c, 16))).join('');
}

/** Launches Chromium with the built extension loaded. Run `bun run build` first. */
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads fixture deps from this pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads fixture deps from this pattern
  extensionId: async ({}, use) => {
    await use(unpackedExtensionId(extensionPath));
  },
});

export const expect = test.expect;
