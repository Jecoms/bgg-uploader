import { describe, expect, it } from 'vitest';
import { at } from '../test-utils';
import page from './__fixtures__/collection-page.html?raw';
import {
  indexByObjectId,
  parseCollectionPage,
  parseStatusCell,
  readCollection,
} from './collection';

describe('parseCollectionPage', () => {
  const parsed = parseCollectionPage(page);

  it('reads the pager', () => {
    expect(parsed).toMatchObject({ from: 1, to: 300, total: 461 });
  });

  it('parses one row per <tr id=row_*>', () => {
    expect(parsed.rows.map((r) => r.name)).toEqual([
      '5211',
      '51st State',
      'Betrayal Legacy',
      'Champions of Midgard',
      'Azul',
    ]);
  });

  it('extracts collid, objectid and year', () => {
    const azul = parsed.rows.find((r) => r.name === 'Azul');
    expect(azul).toMatchObject({ collid: 47994218, objectid: 230802 });
    expect(azul?.year).toBe(2017);
  });

  it('parses status flags per row', () => {
    const by = Object.fromEntries(parsed.rows.map((r) => [r.name, r.status]));
    expect(by['5211']).toEqual({ own: true });
    expect(by['51st State']).toEqual({});
    expect(by['Betrayal Legacy']).toEqual({ wanttoplay: true });
    expect(by['Champions of Midgard']).toEqual({ wishlist: true, wishlistpriority: 4 });
    expect(by.Azul).toEqual({ wanttobuy: true, wanttoplay: true });
  });
});

describe('parseStatusCell', () => {
  it('maps the owned class to own', () => {
    expect(parseStatusCell("<div class='owned'>Owned</div>")).toEqual({ own: true });
  });
  it('ignores unknown classes', () => {
    expect(parseStatusCell("<div class='something'>x</div>")).toEqual({});
  });
});

describe('indexByObjectId', () => {
  it('groups multiple rows for the same game', () => {
    const rows = parseCollectionPage(page).rows;
    const first = at(rows, 0);
    const idx = indexByObjectId([...rows, { ...first, collid: 1 }]);
    expect(idx.get(first.objectid)).toHaveLength(2);
    expect(idx.size).toBe(rows.length);
  });
});

describe('readCollection', () => {
  it('walks pages until the pager says it has everything', async () => {
    const p1 = page.replace('1 to 300 of 461', '1 to 5 of 7');
    const p2 = page.replace('1 to 300 of 461', '6 to 7 of 7').replace(/row_(\d+)/g, 'row_9$1');
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      const pageID = new URL(url).searchParams.get('pageID');
      return new Response(pageID === '1' ? p1 : p2, { status: 200 });
    };
    const rows = await readCollection(
      { username: 'testuser', userid: '12345' },
      { fetch: fetchImpl },
    );
    expect(calls).toHaveLength(2);
    expect(at(calls, 0)).toContain('action=collectionpage');
    expect(at(calls, 0)).toContain('username=testuser');
    expect(rows).toHaveLength(10);
  });

  it('stops if the server keeps returning the same page', async () => {
    let n = 0;
    const fetchImpl = async () => {
      n++;
      return new Response(page, { status: 200 });
    };
    const rows = await readCollection({ username: 'u', userid: '1' }, { fetch: fetchImpl });
    expect(n).toBe(2);
    expect(rows).toHaveLength(10);
  });
});
