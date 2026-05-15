import { describe, expect, it } from 'vitest';

import {
  formatConstraintExpression,
  formatValueLiteral,
  formatValuePropertySignature,
} from '@/model';

describe('formatValueLiteral', () => {
  it('quotes a string literal', () => {
    expect(formatValueLiteral('alpha')).toBe('"alpha"');
  });

  it('renders an empty string as quoted empty', () => {
    expect(formatValueLiteral('')).toBe('""');
  });

  it('renders numbers as their JS string form', () => {
    expect(formatValueLiteral(12.5)).toBe('12.5');
    expect(formatValueLiteral(0)).toBe('0');
    expect(formatValueLiteral(-1)).toBe('-1');
  });

  it('renders booleans as "true" / "false"', () => {
    expect(formatValueLiteral(true)).toBe('true');
    expect(formatValueLiteral(false)).toBe('false');
  });
});

describe('formatValuePropertySignature', () => {
  it('returns ": <type>" when defaultValue is undefined', () => {
    expect(formatValuePropertySignature('number', undefined)).toBe(': number');
    expect(formatValuePropertySignature('string', undefined)).toBe(': string');
    expect(formatValuePropertySignature('boolean', undefined)).toBe(
      ': boolean',
    );
  });

  it('appends "= <literal>" when defaultValue is a number', () => {
    expect(formatValuePropertySignature('number', 12.5)).toBe(
      ': number = 12.5',
    );
    expect(formatValuePropertySignature('number', 0)).toBe(': number = 0');
  });

  it('appends "= <literal>" when defaultValue is a boolean', () => {
    expect(formatValuePropertySignature('boolean', true)).toBe(
      ': boolean = true',
    );
    expect(formatValuePropertySignature('boolean', false)).toBe(
      ': boolean = false',
    );
  });

  it('appends quoted literal when defaultValue is a string', () => {
    expect(formatValuePropertySignature('string', 'alpha')).toBe(
      ': string = "alpha"',
    );
  });

  it('treats an empty-string default as a present value (rendered "")', () => {
    expect(formatValuePropertySignature('string', '')).toBe(': string = ""');
  });
});

describe('formatConstraintExpression', () => {
  it('returns the trimmed expression when non-empty', () => {
    expect(formatConstraintExpression('F = m * a')).toBe('F = m * a');
  });

  it('trims surrounding whitespace', () => {
    expect(formatConstraintExpression('   F = m * a   ')).toBe('F = m * a');
    expect(formatConstraintExpression('\nF = m * a\t')).toBe('F = m * a');
  });

  it('returns null for an empty string', () => {
    expect(formatConstraintExpression('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(formatConstraintExpression('   ')).toBeNull();
    expect(formatConstraintExpression('\n\t  ')).toBeNull();
  });
});
