import { describe, expect, it } from 'vitest';

import type { PackageElement, ModelElement } from '@/model';
import {
  KERML_CORE_ELEMENT_IDS,
  KERML_CORE_LIBRARY_ROOT_ID,
  kermlCoreElements,
} from '@/library/kerml/core';

describe('KerML core library fixture (T-14.04)', () => {
  it('returns a fresh array on every call (no shared mutable state)', () => {
    const a = kermlCoreElements();
    const b = kermlCoreElements();
    expect(a).not.toBe(b);
    // Mutating one must not affect the other.
    a.length = 0;
    expect(b.length).toBeGreaterThan(0);
  });

  it('exposes the named primitives from KerML', () => {
    const names = kermlCoreElements().map((e) => e.name);
    expect(names).toEqual([
      'Base',
      'Anything',
      'Item',
      'Part',
      'Port',
      'Connection',
      'Action',
      'Performance',
      'Definition',
      'Usage',
    ]);
  });

  it('uses stable namespaced ids', () => {
    expect(KERML_CORE_LIBRARY_ROOT_ID).toBe('kerml.core.Base');
    expect(KERML_CORE_ELEMENT_IDS.Anything).toBe('kerml.core.Base.Anything');
    expect(KERML_CORE_ELEMENT_IDS.Part).toBe('kerml.core.Base.Part');
    expect(KERML_CORE_ELEMENT_IDS.Port).toBe('kerml.core.Base.Port');
    expect(KERML_CORE_ELEMENT_IDS.Action).toBe('kerml.core.Base.Action');

    const ids = kermlCoreElements().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
  });

  it('root Base package is the only ownerId === null element and is read-only', () => {
    const els = kermlCoreElements();
    const rootCandidates = els.filter((e) => e.ownerId === null);
    expect(rootCandidates).toHaveLength(1);
    const root = rootCandidates[0] as PackageElement;
    expect(root.id).toBe(KERML_CORE_LIBRARY_ROOT_ID);
    expect(root.kind).toBe('Package');
    expect(root.isReadOnly).toBe(true);
  });

  it('every descendant is contained (directly or transitively) by the read-only root', () => {
    const els = kermlCoreElements();
    const byId = new Map<string, ModelElement>(els.map((e) => [e.id, e]));
    for (const el of els) {
      if (el.ownerId === null) continue;
      // Walk up — must terminate at the read-only root.
      let cursor: ModelElement | undefined = el;
      const seen = new Set<string>();
      while (cursor && cursor.ownerId !== null) {
        if (seen.has(cursor.id)) {
          throw new Error(`cycle through ${cursor.id}`);
        }
        seen.add(cursor.id);
        cursor = byId.get(cursor.ownerId);
      }
      expect(cursor?.id).toBe(KERML_CORE_LIBRARY_ROOT_ID);
    }
  });

  it('maps KerML concepts onto existing metamodel kinds', () => {
    const byName = new Map(kermlCoreElements().map((e) => [e.name, e]));
    expect(byName.get('Base')?.kind).toBe('Package');
    expect(byName.get('Anything')?.kind).toBe('PartDefinition');
    expect(byName.get('Item')?.kind).toBe('PartDefinition');
    expect(byName.get('Part')?.kind).toBe('PartDefinition');
    expect(byName.get('Port')?.kind).toBe('PortDefinition');
    expect(byName.get('Connection')?.kind).toBe('InterfaceDefinition');
    expect(byName.get('Action')?.kind).toBe('ActionDefinition');
    expect(byName.get('Performance')?.kind).toBe('ActionDefinition');
    expect(byName.get('Definition')?.kind).toBe('PartDefinition');
    expect(byName.get('Usage')?.kind).toBe('PartDefinition');
  });

  it('marks abstract meta-classifiers (Anything, Definition, Usage) as isAbstract', () => {
    const byName = new Map(kermlCoreElements().map((e) => [e.name, e]));
    const anything = byName.get('Anything');
    const definition = byName.get('Definition');
    const usage = byName.get('Usage');
    const part = byName.get('Part');
    if (
      anything?.kind !== 'PartDefinition' ||
      definition?.kind !== 'PartDefinition' ||
      usage?.kind !== 'PartDefinition' ||
      part?.kind !== 'PartDefinition'
    ) {
      throw new Error('expected PartDefinition kinds for abstract checks');
    }
    expect(anything.isAbstract).toBe(true);
    expect(definition.isAbstract).toBe(true);
    expect(usage.isAbstract).toBe(true);
    // Concrete by contrast:
    expect(part.isAbstract).toBe(false);
  });

  it('Port has default direction inout', () => {
    const port = kermlCoreElements().find((e) => e.name === 'Port');
    if (port?.kind !== 'PortDefinition') {
      throw new Error('expected PortDefinition');
    }
    expect(port.direction).toBe('inout');
  });

  it('every element carries documentation explaining its role', () => {
    for (const el of kermlCoreElements()) {
      expect(el.documentation).toBeDefined();
      expect(el.documentation!.length).toBeGreaterThan(20);
    }
  });
});
