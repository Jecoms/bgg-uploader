/**
 * Split raw user input into a deduplicated list of game names.
 * Accepts newline- or semicolon-separated input; strips quotes and whitespace.
 */
export function parseNames(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[\n;]/)) {
    const name = raw.replace(/"/g, '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
