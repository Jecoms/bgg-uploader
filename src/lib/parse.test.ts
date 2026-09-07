import { describe, expect, it } from 'vitest';
import { parseNames } from './parse';

describe('parseNames', () => {
  it('splits on newlines and semicolons', () => {
    expect(parseNames('Catan\nWingspan; Ark Nova')).toEqual(['Catan', 'Wingspan', 'Ark Nova']);
  });

  it('strips quotes and blank entries', () => {
    expect(parseNames('"Catan"\n\n  \n"Wingspan"')).toEqual(['Catan', 'Wingspan']);
  });

  it('dedupes case-insensitively, keeping the first spelling', () => {
    expect(parseNames('Catan\ncatan\nCATAN')).toEqual(['Catan']);
  });

  it('returns an empty list for empty input', () => {
    expect(parseNames('')).toEqual([]);
  });
});
