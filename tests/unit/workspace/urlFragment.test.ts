import { describe, expect, it } from 'vitest';

import { formatUrlFragment, parseUrlFragment } from '@/workspace/urlFragment';

describe('parseUrlFragment', () => {
  it('parses canonical #/element/<id>', () => {
    expect(parseUrlFragment('#/element/abc-123')).toEqual({
      kind: 'element',
      id: 'abc-123',
    });
  });

  it('parses canonical #/diagram/<id>', () => {
    expect(parseUrlFragment('#/diagram/dgm-9')).toEqual({
      kind: 'diagram',
      id: 'dgm-9',
    });
  });

  it('tolerates the leading slash being absent', () => {
    expect(parseUrlFragment('#element/abc')).toEqual({
      kind: 'element',
      id: 'abc',
    });
    expect(parseUrlFragment('#diagram/dgm')).toEqual({
      kind: 'diagram',
      id: 'dgm',
    });
  });

  it('decodes percent-encoded ids', () => {
    expect(parseUrlFragment('#/element/has%20space')).toEqual({
      kind: 'element',
      id: 'has space',
    });
  });

  it('returns null for empty / sentinel hashes', () => {
    expect(parseUrlFragment('')).toBeNull();
    expect(parseUrlFragment('#')).toBeNull();
    expect(parseUrlFragment('#/')).toBeNull();
  });

  it('returns null for unknown shapes', () => {
    expect(parseUrlFragment('#/unknown/abc')).toBeNull();
    expect(parseUrlFragment('#/element/')).toBeNull();
    expect(parseUrlFragment('foo')).toBeNull();
  });

  it('returns null for malformed percent-encoding', () => {
    expect(parseUrlFragment('#/element/%E0%A4%A')).toBeNull();
  });
});

describe('formatUrlFragment', () => {
  it('formats single-selection as #/element/<id>', () => {
    expect(
      formatUrlFragment({
        selectedElementIds: ['abc-123'],
        activeDiagramId: 'dgm-9',
      }),
    ).toBe('#/element/abc-123');
  });

  it('falls back to #/diagram/<id> when selection is empty', () => {
    expect(
      formatUrlFragment({
        selectedElementIds: [],
        activeDiagramId: 'dgm-9',
      }),
    ).toBe('#/diagram/dgm-9');
  });

  it('falls back to #/diagram/<id> when selection is multi (no canonical encoding)', () => {
    expect(
      formatUrlFragment({
        selectedElementIds: ['a', 'b'],
        activeDiagramId: 'dgm-9',
      }),
    ).toBe('#/diagram/dgm-9');
  });

  it('returns empty string when neither selection nor active diagram exist', () => {
    expect(
      formatUrlFragment({
        selectedElementIds: [],
        activeDiagramId: null,
      }),
    ).toBe('');
  });

  it('percent-encodes ids with reserved characters', () => {
    expect(
      formatUrlFragment({
        selectedElementIds: ['has space'],
        activeDiagramId: null,
      }),
    ).toBe('#/element/has%20space');
  });

  it('round-trips through parse', () => {
    const original = { selectedElementIds: ['abc-123'], activeDiagramId: null };
    const hash = formatUrlFragment(original);
    expect(parseUrlFragment(hash)).toEqual({ kind: 'element', id: 'abc-123' });
  });
});
