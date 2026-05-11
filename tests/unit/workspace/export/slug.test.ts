import { describe, expect, it } from 'vitest';

import { slugifyDiagramName } from '@/workspace/export/slug';

describe('slugifyDiagramName', () => {
  it('lower-cases the name', () => {
    expect(slugifyDiagramName('Main BDD')).toBe('main-bdd');
  });

  it('collapses runs of whitespace into a single dash', () => {
    expect(slugifyDiagramName('  Engine\t\tSubsystem  ')).toBe('engine-subsystem');
  });

  it('strips characters that are not safe in cross-platform filenames', () => {
    expect(slugifyDiagramName('Block / Definition: v1?')).toBe('block-definition-v1');
  });

  it('collapses runs of dashes into a single dash', () => {
    expect(slugifyDiagramName('a---b__c')).toBe('a-b-c');
  });

  it('falls back to "diagram" when the name is empty or pure punctuation', () => {
    expect(slugifyDiagramName('')).toBe('diagram');
    expect(slugifyDiagramName('!!!')).toBe('diagram');
    expect(slugifyDiagramName('   ')).toBe('diagram');
  });

  it('caps the result at 64 characters', () => {
    const long = 'x'.repeat(120);
    expect(slugifyDiagramName(long)).toHaveLength(64);
  });

  it('preserves digits and ASCII letters', () => {
    expect(slugifyDiagramName('System Of Systems 42')).toBe('system-of-systems-42');
  });
});
