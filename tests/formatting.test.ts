import { describe, expect, it } from 'vitest';
import { parseFormatting } from '../src/lib/operations/formatting';

describe('parseFormatting', () => {
  it('returns exactly one span for plain text (regression: no 4x duplication)', () => {
    const spans = parseFormatting('hi');
    expect(spans).toEqual([{ text: 'hi' }]);
    expect(spans.map(s => s.text).join('')).toBe('hi');
  });

  it('never duplicates any input character across spans', () => {
    const samples = [
      'Eclampsia — Management Framework',
      'hi hi hi hi',
      'New-onset seizures in a pre-eclamptic patient',
      'Toxicity watch: reflexes, RR, urine output',
    ];
    for (const s of samples) {
      const spans = parseFormatting(s);
      expect(spans.map(sp => sp.text).join('')).toBe(s);
      expect(spans.length).toBe(1);
    }
  });

  it('parses bold markers into one bold span', () => {
    expect(parseFormatting('**bold**')).toEqual([{ text: 'bold', bold: true }]);
  });

  it('parses italic markers into one italic span', () => {
    expect(parseFormatting('*it*')).toEqual([{ text: 'it', italic: true }]);
  });

  it('parses underline markers into one underline span', () => {
    expect(parseFormatting('__under__')).toEqual([{ text: 'under', underline: true }]);
  });

  it('splits mixed plain + bold + italic without duplication or loss', () => {
    const spans = parseFormatting('a**b**c');
    expect(spans.map(s => s.text).join('')).toBe('a**b**c'.replace(/\*\*/g, ''));
    expect(spans).toEqual([
      { text: 'a' },
      { text: 'b', bold: true },
      { text: 'c' },
    ]);
    const spans2 = parseFormatting('x*y*z');
    expect(spans2.map(s => s.text).join('')).toBe('xyz');
    expect(spans2).toEqual([
      { text: 'x' },
      { text: 'y', italic: true },
      { text: 'z' },
    ]);
  });

  it('keeps nested markers on the same text once', () => {
    const spans = parseFormatting('__u__ and **b** and *i*');
    expect(spans.length).toBe(5); // u, ' and ', b, ' and ', i — nothing duplicated or lost
    expect(spans.map(s => s.text).join('')).toBe('u and b and i');
  });
});
