import { describe, expect, it } from 'vitest';

import { composeTransitionLabel } from '@/viewpoints';

describe('composeTransitionLabel (ADR 0006 § 3)', () => {
  it('returns an empty string when all three fields are empty', () => {
    expect(
      composeTransitionLabel({
        trigger: undefined,
        guard: undefined,
        effect: undefined,
      }),
    ).toBe('');
    expect(
      composeTransitionLabel({ trigger: '', guard: '', effect: '' }),
    ).toBe('');
    expect(
      composeTransitionLabel({
        trigger: '   ',
        guard: '   ',
        effect: '   ',
      }),
    ).toBe('');
  });

  it('renders trigger alone', () => {
    expect(
      composeTransitionLabel({
        trigger: 'doorClosed',
        guard: undefined,
        effect: undefined,
      }),
    ).toBe('doorClosed');
  });

  it('renders guard alone in brackets', () => {
    expect(
      composeTransitionLabel({
        trigger: undefined,
        guard: 'fuel > 0',
        effect: undefined,
      }),
    ).toBe('[fuel > 0]');
  });

  it('renders effect alone with leading slash', () => {
    expect(
      composeTransitionLabel({
        trigger: undefined,
        guard: undefined,
        effect: 'logExit()',
      }),
    ).toBe('/ logExit()');
  });

  it('renders trigger + guard separated by a space', () => {
    expect(
      composeTransitionLabel({
        trigger: 'tick',
        guard: 'count < 10',
        effect: undefined,
      }),
    ).toBe('tick [count < 10]');
  });

  it('renders trigger + effect separated by " / "', () => {
    expect(
      composeTransitionLabel({
        trigger: 'tick',
        guard: undefined,
        effect: 'incCount()',
      }),
    ).toBe('tick / incCount()');
  });

  it('renders guard + effect with a leading bracket and / separator', () => {
    expect(
      composeTransitionLabel({
        trigger: undefined,
        guard: 'count < 10',
        effect: 'incCount()',
      }),
    ).toBe('[count < 10] / incCount()');
  });

  it('renders all three with the canonical SysMLv2 separator', () => {
    expect(
      composeTransitionLabel({
        trigger: 'tick',
        guard: 'count < 10',
        effect: 'incCount()',
      }),
    ).toBe('tick [count < 10] / incCount()');
  });

  it('trims whitespace on each field before composing', () => {
    expect(
      composeTransitionLabel({
        trigger: '  tick  ',
        guard: '  count < 10  ',
        effect: '  incCount()  ',
      }),
    ).toBe('tick [count < 10] / incCount()');
  });
});
