import { describe, expect, it } from 'vitest';
import { at } from '../test-utils';
import searchD from './__fixtures__/search-d.html?raw';
import searchDnup from './__fixtures__/search-dnup.html?raw';
import searchEmpty from './__fixtures__/search-empty.html?raw';
import { parseSearchResults, searchGames } from './search';

describe('parseSearchResults', () => {
  it('parses id, name and year from the instant search fragment', () => {
    const hits = parseSearchResults(searchD);
    expect(hits).toHaveLength(4);
    expect(at(hits, 0)).toEqual({ objectid: 316554, name: 'Dune: Imperium', year: 2020 });
    expect(at(hits, 1)).toEqual({ objectid: 36218, name: 'Dominion', year: 2008 });
  });

  it('parses a single exact hit', () => {
    expect(parseSearchResults(searchDnup)).toEqual([
      { objectid: 432456, name: 'dnup', year: 2025 },
    ]);
  });

  it('returns nothing for an empty fragment', () => {
    expect(parseSearchResults(searchEmpty)).toEqual([]);
  });
});

describe('searchGames', () => {
  it('POSTs the instantsearch form with cookies and parses the response', async () => {
    let captured: { url: string; init?: RequestInit } | undefined;
    const fetchImpl = async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return new Response(searchDnup, { status: 200 });
    };
    const hits = await searchGames('dnup', { fetch: fetchImpl });
    expect(at(hits, 0).objectid).toBe(432456);
    expect(captured?.url).toBe('https://boardgamegeek.com/geeksearch.php');
    expect(captured?.init?.method).toBe('POST');
    expect(captured?.init?.credentials).toBe('include');
    const body = new URLSearchParams(String(captured?.init?.body));
    expect(body.get('action')).toBe('instantsearch');
    expect(body.get('q')).toBe('dnup');
    expect(body.get('objecttype')).toBe('boardgame');
  });
});
