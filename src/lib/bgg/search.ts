import { bggRequest, type HttpOptions } from './http';

export interface SearchHit {
  objectid: number;
  name: string;
  year: number | null;
}

/**
 * BGG's instant search (the typeahead on the collection page's "Add a Game" widget).
 * Returns an HTML fragment; each hit is a div whose onclick carries the object id and name.
 */
export async function searchGames(query: string, opts: HttpOptions = {}): Promise<SearchHit[]> {
  const html = await bggRequest(
    '/geeksearch.php',
    {
      form: {
        action: 'instantsearch',
        ajax: '1',
        objecttype: 'boardgame',
        q: query,
        itemid: '0',
        uniqueid: 'bgguploader',
        onclick: '',
        extraonclick: '',
        formname: '',
        textareaname: '',
        showexact: '',
        inline: '',
      },
    },
    opts,
  );
  return parseSearchResults(html);
}

const HIT_RE =
  /SetInstantSearchObject\(\s*\{[^}]*?objectid:\s*'(\d+)'[^}]*?name:\s*'((?:\\'|[^'])*)'[^}]*?\}\s*\)\s*;?\s*">\s*<div[^>]*>([\s\S]*?)<\/div>/g;

export function parseSearchResults(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const seen = new Set<number>();
  for (const m of html.matchAll(HIT_RE)) {
    const [, id = '', rawName = '', label = ''] = m;
    const objectid = Number(id);
    if (seen.has(objectid)) continue;
    seen.add(objectid);
    const name = decodeJsString(rawName);
    const yearMatch = label.match(/\((\d{4})\)/);
    hits.push({ objectid, name, year: yearMatch ? Number(yearMatch[1]) : null });
  }
  return hits;
}

function decodeJsString(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/&amp;/g, '&');
}
