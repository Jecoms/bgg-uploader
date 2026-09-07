import { bggRequest, type HttpOptions } from './http';
import { STATUS_KEYS, type StatusFlags, type StatusKey } from './status';

export interface CollectionRow {
  collid: number;
  objectid: number;
  name: string;
  year: number | null;
  status: StatusFlags;
}

export interface CollectionPage {
  rows: CollectionRow[];
  /** 1-based index of the first row on this page */
  from: number;
  to: number;
  total: number;
}

export interface CollectionIdentity {
  username: string;
  userid: string;
}

export async function readCollectionPage(
  who: CollectionIdentity,
  pageID: number,
  opts: HttpOptions = {},
): Promise<CollectionPage> {
  const qs = new URLSearchParams({
    ajax: '1',
    action: 'collectionpage',
    username: who.username,
    userid: who.userid,
    gallery: '',
    sort: 'title',
    sortdir: '',
    page: '',
    pageID: String(pageID),
  });
  const html = await bggRequest(`/geekcollection.php?${qs}`, {}, opts);
  return parseCollectionPage(html);
}

/** Read every page of the user's collection. */
export async function readCollection(
  who: CollectionIdentity,
  opts: HttpOptions = {},
  onPage?: (page: CollectionPage) => void,
): Promise<CollectionRow[]> {
  const rows: CollectionRow[] = [];
  let lastTo = 0;
  for (let pageID = 1; ; pageID++) {
    const page = await readCollectionPage(who, pageID, opts);
    onPage?.(page);
    rows.push(...page.rows);
    // Stop at the end, or if the server keeps returning the same page (defensive: no infinite loop).
    if (page.rows.length === 0 || page.to >= page.total || page.to <= lastTo) break;
    lastTo = page.to;
  }
  return rows;
}

/** Index rows by objectid; a game can have several rows (one per version). */
export function indexByObjectId(rows: CollectionRow[]): Map<number, CollectionRow[]> {
  const map = new Map<number, CollectionRow[]>();
  for (const r of rows) {
    const list = map.get(r.objectid);
    if (list) list.push(r);
    else map.set(r.objectid, [r]);
  }
  return map;
}

const PAGER_RE = /(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/;

export function parseCollectionPage(html: string): CollectionPage {
  const pager = html.match(PAGER_RE);
  const rows: CollectionRow[] = [];
  const chunks = html.split(/(?=<tr id='row_\d+'>)/);
  for (const chunk of chunks) {
    const row = parseRow(chunk);
    if (row) rows.push(row);
  }
  return {
    rows,
    from: pager ? Number(pager[1]) : rows.length ? 1 : 0,
    to: pager ? Number(pager[2]) : rows.length,
    total: pager ? Number(pager[3]) : rows.length,
  };
}

function parseRow(chunk: string): CollectionRow | null {
  const collid = chunk.match(/^<tr id='row_(\d+)'>/);
  if (!collid) return null;
  const objectid = chunk.match(/objectid:\s*'(\d+)'/);
  const link = chunk.match(
    /<a\s+href="\/boardgame(?:expansion|accessory)?\/(\d+)\/[^"]*"\s+class='primary'\s*>([\s\S]*?)<\/a>/,
  );
  if (!objectid && !link) return null;
  const nameCell = chunk.match(/<div id='results_objectname\d+'[\s\S]*?<\/div>/);
  const year = nameCell?.[0].match(/\((\d{4})\)/);
  const statusCell = chunk.match(/<div id='results_status\d+'[^>]*>([\s\S]*?)<\/div>\s*<\/td>/);
  return {
    collid: Number(collid[1]),
    objectid: Number(objectid?.[1] ?? link?.[1] ?? 0),
    name: decodeHtml(link?.[2] ?? '').trim(),
    year: year?.[1] ? Number(year[1]) : null,
    status: parseStatusCell(statusCell?.[1] ?? ''),
  };
}

/** Status cell contains one <div class='<flag>'>Label</div> per set flag; empty when none. */
export function parseStatusCell(inner: string): StatusFlags {
  const flags: StatusFlags = {};
  for (const m of inner.matchAll(/<div class='(\w+)'>([\s\S]*?)<\/div>/g)) {
    const raw = m[1] ?? '';
    const cls = raw === 'owned' ? 'own' : raw;
    if ((STATUS_KEYS as readonly string[]).includes(cls)) flags[cls as StatusKey] = true;
    if (cls === 'wishlist') {
      const pri = (m[2] ?? '').match(/Wishlist\s*\((\d)\)/);
      if (pri?.[1]) flags.wishlistpriority = Number(pri[1]);
    }
  }
  return flags;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
