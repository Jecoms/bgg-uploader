/** Index into an array in tests, failing loudly instead of yielding undefined. */
export function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`expected element at index ${i}`);
  return v;
}
