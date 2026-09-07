import { bggRequest, encodeForm, type HttpOptions } from './http';

export const STATUS_KEYS = [
  'own',
  'prevowned',
  'fortrade',
  'want',
  'wanttoplay',
  'wanttobuy',
  'preordered',
  'wishlist',
] as const;
export type StatusKey = (typeof STATUS_KEYS)[number];

export type StatusFlags = Partial<Record<StatusKey, boolean>> & {
  /** 1 (must have) .. 5 (don't buy); only meaningful with wishlist */
  wishlistpriority?: number;
};

export const emptyStatus = (): StatusFlags => ({});
export const ownedStatus = (): StatusFlags => ({ own: true });

export function hasAnyStatus(f: StatusFlags): boolean {
  return STATUS_KEYS.some((k) => f[k]);
}

/**
 * Add a game that is NOT yet in the collection. Creates a new collection row.
 * Response body is empty on success; there is no returned collid.
 */
export async function addItem(
  objectid: number,
  flags: { own?: boolean; wishlist?: boolean; wishlistpriority?: number } = { own: true },
  opts: HttpOptions = {},
): Promise<void> {
  await bggRequest(
    '/geekcollection.php',
    {
      form: {
        action: 'additem',
        ajax: '1',
        objecttype: 'thing',
        objectid: String(objectid),
        addowned: flags.own ? 'true' : 'false',
        addwish: flags.wishlist ? 'true' : 'false',
        wishlistpriority: String(flags.wishlistpriority ?? 1),
        force: 'true',
      },
    },
    opts,
  );
}

/**
 * Replace the status flags of an existing collection row.
 * This is a full replace: any flag not passed as true is cleared.
 * Returns the rendered status cell HTML.
 */
export async function saveStatus(
  collid: number,
  objectid: number,
  flags: StatusFlags,
  opts: HttpOptions = {},
): Promise<string> {
  const form = encodeForm({
    action: 'savedata',
    ajax: '1',
    fieldname: 'status',
    collid,
    objecttype: 'thing',
    objectid,
    ...Object.fromEntries(STATUS_KEYS.map((k) => [k, flags[k] ?? false])),
    wishlistpriority: flags.wishlistpriority ?? 3,
  });
  return bggRequest('/geekcollection.php', { form }, opts);
}

/** Fetch the inline status editor for a row and read its current flags. */
export async function fetchStatus(
  collid: number,
  objectid: number,
  opts: HttpOptions = {},
): Promise<StatusFlags> {
  const qs = new URLSearchParams({
    ajax: '1',
    action: 'editdata',
    fieldname: 'status',
    cellid: '0',
    collid: String(collid),
    objecttype: 'thing',
    objectid: String(objectid),
  });
  const html = await bggRequest(`/geekcollection.php?${qs}`, {}, opts);
  return parseStatusForm(html);
}

export function parseStatusForm(html: string): StatusFlags {
  const flags: StatusFlags = {};
  for (const m of html.matchAll(/<input[^>]*name='(\w+)'[^>]*type='checkbox'[^>]*>/g)) {
    const key = m[1] as StatusKey;
    if ((STATUS_KEYS as readonly string[]).includes(key) && /\bCHECKED\b/i.test(m[0])) {
      flags[key] = true;
    }
  }
  const pri = html.match(/<option value='(\d)'\s+SELECTED/i);
  if (pri) flags.wishlistpriority = Number(pri[1]);
  return flags;
}
