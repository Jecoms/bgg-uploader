export const BGG_ORIGIN = 'https://boardgamegeek.com';

export class BggHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message?: string,
  ) {
    super(message ?? `BGG request failed: ${status} ${url}`);
    this.name = 'BggHttpError';
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  fetch?: FetchLike;
  /** Max attempts for retryable statuses (429, 5xx). */
  attempts?: number;
  /** Base delay in ms for exponential backoff. */
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Same-origin request to boardgamegeek.com carrying the user's cookies. */
export async function bggRequest(
  path: string,
  init: RequestInit & { form?: Record<string, string> } = {},
  opts: HttpOptions = {},
): Promise<string> {
  const fetchImpl = opts.fetch ?? fetch;
  const attempts = opts.attempts ?? 4;
  const backoff = opts.backoffMs ?? 1500;
  const sleep = opts.sleep ?? defaultSleep;
  const url = path.startsWith('http') ? path : `${BGG_ORIGIN}${path}`;

  const headers: Record<string, string> = {
    Accept: 'text/javascript, text/html, application/xml, text/xml, */*',
    'X-Requested-With': 'XMLHttpRequest',
  };
  let body: BodyInit | undefined = init.body ?? undefined;
  if (init.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
    body = new URLSearchParams(init.form).toString();
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetchImpl(url, {
      ...init,
      method: init.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      credentials: 'include',
    });
    if (res.ok) return res.text();
    lastError = new BggHttpError(res.status, url);
    if (!RETRYABLE.has(res.status) || attempt === attempts) throw lastError;
    await sleep(backoff * 2 ** (attempt - 1));
  }
  throw lastError;
}

export function encodeForm(fields: Record<string, string | number | boolean | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === false) continue;
    out[k] = v === true ? '1' : String(v);
  }
  return out;
}
