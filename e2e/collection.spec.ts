import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures';

const fx = (name: string) =>
  fs.readFileSync(path.resolve(import.meta.dirname, '../src/lib/bgg/__fixtures__', name), 'utf8');

/** Minimal stand-in for BGG's collection page: owner inputs + add-game widget + the captured table. */
const collectionPage = `<!doctype html><html><body>
  <div id='addgame' style='display:none'>
    <input type='hidden' id='username' name='username' value='testuser'>
    <input type='hidden' id='userid' name='userid' value='12345'>
  </div>
  ${fx('collection-page.html').replace('1 to 300 of 461', '1 to 5 of 5')}
</body></html>`;

const searchHit = (objectid: number, name: string, year: number) => `
  <div onclick="SetInstantSearchObject( { itemid: '0', objecttype: 'thing', objectid: '${objectid}', name: '${name}', uniqueid: 'x' } );">
    <div style='padding: 4px 15px;'>${name} (${year})</div></div>`;
const searchDb: Record<string, string> = {
  dnup: searchHit(432456, 'dnup', 2025), // not in collection -> add
  Azul: searchHit(230802, 'Azul', 2017), // in collection as want-to-buy/play -> mark owned
  '5211': searchHit(271512, '5211', 2019), // already owned -> skip
};

test('bulk update flow against captured BGG responses', async ({ context, page }) => {
  const writes: URLSearchParams[] = [];

  await context.route('https://boardgamegeek.com/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = new URLSearchParams(req.postData() ?? '');
    const html = (b: string) => route.fulfill({ status: 200, contentType: 'text/html', body: b });

    if (url.pathname.startsWith('/collection/user/')) return html(collectionPage);
    if (url.pathname === '/geeksearch.php') return html(searchDb[body.get('q') ?? ''] ?? '');
    if (url.pathname === '/geekcollection.php') {
      const action = url.searchParams.get('action') ?? body.get('action');
      if (action === 'collectionpage')
        return html(fx('collection-page.html').replace('1 to 300 of 461', '1 to 5 of 5'));
      if (action === 'additem' || action === 'savedata') {
        writes.push(body);
        return html(action === 'savedata' ? "<div class='owned'>Owned</div>" : '');
      }
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto('https://boardgamegeek.com/collection/user/testuser');
  await page.getByRole('button', { name: 'Bulk update collection' }).click();
  await page.getByRole('textbox').fill('dnup\nAzul\n5211');
  await page.getByRole('button', { name: 'Look up games' }).click();

  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByText('1 to add')).toBeVisible();
  await expect(page.getByText('1 to mark owned')).toBeVisible();
  await expect(page.getByText('1 already owned')).toBeVisible();

  await page.getByRole('button', { name: 'Import 2 games' }).click();
  await expect(page.getByText('2 of 2 processed')).toBeVisible({ timeout: 15_000 });

  expect(writes).toHaveLength(2);
  const add = writes.find((w) => w.get('action') === 'additem');
  const save = writes.find((w) => w.get('action') === 'savedata');
  expect(add?.get('objectid')).toBe('432456');
  expect(add?.get('addowned')).toBe('true');
  expect(save?.get('collid')).toBe('47994218');
  expect(save?.get('objectid')).toBe('230802');
  expect(save?.get('own')).toBe('1');
  expect(save?.has('wanttobuy')).toBe(false);
});
