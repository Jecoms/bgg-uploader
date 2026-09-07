import { describe, expect, it } from 'vitest';
import { at } from '../test-utils';
import editstatus from './__fixtures__/editstatus.html?raw';
import { addItem, fetchStatus, parseStatusForm, saveStatus } from './status';

const capture = (body: string, status = 200) => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  };
  return { calls, fetchImpl };
};
const formOf = (c: { init?: RequestInit }) => new URLSearchParams(String(c.init?.body));

describe('parseStatusForm', () => {
  it('reads CHECKED flags and the selected wishlist priority', () => {
    expect(parseStatusForm(editstatus)).toEqual({
      wanttoplay: true,
      wanttobuy: true,
      wishlistpriority: 3,
    });
  });
});

describe('fetchStatus', () => {
  it('GETs the editdata form and parses it', async () => {
    const { calls, fetchImpl } = capture(editstatus);
    const flags = await fetchStatus(47994218, 230802, { fetch: fetchImpl });
    expect(flags.wanttobuy).toBe(true);
    const u = new URL(at(calls, 0).url);
    expect(u.searchParams.get('action')).toBe('editdata');
    expect(u.searchParams.get('collid')).toBe('47994218');
    expect(at(calls, 0).init?.method).toBe('GET');
  });
});

describe('saveStatus', () => {
  it('sends only the flags that are set, as a full replace', async () => {
    const { calls, fetchImpl } = capture("<div class='owned'>Owned</div>");
    const html = await saveStatus(47994218, 230802, { own: true }, { fetch: fetchImpl });
    expect(html).toContain('Owned');
    const f = formOf(at(calls, 0));
    expect(f.get('action')).toBe('savedata');
    expect(f.get('fieldname')).toBe('status');
    expect(f.get('collid')).toBe('47994218');
    expect(f.get('objectid')).toBe('230802');
    expect(f.get('own')).toBe('1');
    expect(f.has('wanttoplay')).toBe(false);
    expect(f.get('wishlistpriority')).toBe('3');
  });

  it('preserves other flags when asked to', async () => {
    const { calls, fetchImpl } = capture('');
    await saveStatus(
      1,
      2,
      { own: true, wanttoplay: true, wishlist: true, wishlistpriority: 2 },
      { fetch: fetchImpl },
    );
    const f = formOf(at(calls, 0));
    expect(f.get('own')).toBe('1');
    expect(f.get('wanttoplay')).toBe('1');
    expect(f.get('wishlist')).toBe('1');
    expect(f.get('wishlistpriority')).toBe('2');
  });
});

describe('addItem', () => {
  it('POSTs additem with owned=true by default', async () => {
    const { calls, fetchImpl } = capture('');
    await addItem(432456, undefined, { fetch: fetchImpl });
    const f = formOf(at(calls, 0));
    expect(f.get('action')).toBe('additem');
    expect(f.get('objectid')).toBe('432456');
    expect(f.get('addowned')).toBe('true');
    expect(f.get('addwish')).toBe('false');
    expect(f.get('force')).toBe('true');
  });

  it('retries on 429 then succeeds', async () => {
    let n = 0;
    const fetchImpl = async () => new Response('', { status: n++ === 0 ? 429 : 200 });
    await addItem(1, { own: true }, { fetch: fetchImpl, sleep: async () => {}, backoffMs: 1 });
    expect(n).toBe(2);
  });

  it('throws BggHttpError on 403', async () => {
    const fetchImpl = async () => new Response('', { status: 403 });
    await expect(addItem(1, { own: true }, { fetch: fetchImpl })).rejects.toMatchObject({
      name: 'BggHttpError',
      status: 403,
    });
  });
});
