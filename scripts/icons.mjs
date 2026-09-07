// Rasterize assets/icon.svg into the extension icon sizes. Run: bun run icons
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');
const browser = await chromium.launch();
for (const size of [16, 32, 48, 96, 128]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({
    path: path.join(root, `public/icon/${size}.png`),
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  await page.close();
}
await browser.close();
