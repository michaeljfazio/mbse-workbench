import { describe, expect, it } from 'vitest';
import {
  createElementId,
  createEdgeId,
  createElementRegistry,
  type ElementId,
  type EdgeId,
  type ModelEdge,
  type ModelElement,
  type PartDefinitionElement,
  type RequirementElement,
} from '@/model';
import { mkEdgeId, mkElementId } from './helpers';

function mkPartDef(name: string, id?: ElementId): PartDefinitionElement {
  return {
    id: id ?? createElementId(),
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

function mkComposition(
  source: ElementId,
  target: ElementId,
  id?: EdgeId,
): ModelEdge {
  return {
    id: id ?? createEdgeId(),
    kind: 'Composition',
    sourceId: source,
    targetId: target,
  };
}

describe('id factories', () => {
  it('createElementId returns a non-empty opaque string', () => {
    const id = createElementId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('createElementId returns a unique value per call', () => {
    const a = createElementId();
    const b = createElementId();
    expect(a).not.toBe(b);
  });

  it('createEdgeId returns a non-empty opaque string', () => {
    const id = createEdgeId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('createEdgeId returns a unique value per call', () => {
    const a = createEdgeId();
    const b = createEdgeId();
    expect(a).not.toBe(b);
  });

  it('ids look like RFC 4122 UUIDs', () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(createElementId()).toMatch(uuidPattern);
    expect(createEdgeId()).toMatch(uuidPattern);
  });
});

describe('ElementRegistry — add / get / remove', () => {
  it('add stores an element retrievable by id', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    expect(r.get(v.id)).toEqual(v);
  });

  it('get returns undefined for an unknown id', () => {
    const r = createElementRegistry();
    expect(r.get(mkElementId('nope'))).toBeUndefined();
  });

  it('add throws when called with a duplicate id', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A', mkElementId('dup'));
    const b = mkPartDef('B', mkElementId('dup'));
    r.add(a);
    expect(() => r.add(b)).toThrowError(/duplicate/i);
  });

  it('remove deletes the element and is idempotent', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    r.remove(v.id);
    expect(r.get(v.id)).toBeUndefined();
    expect(() => r.remove(v.id)).not.toThrow();
  });

  it('elements() returns all added elements as a readonly snapshot', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    r.add(a);
    r.add(b);
    const snap = r.elements();
    expect(snap).toHaveLength(2);
    expect(snap.map((e) => e.name).sort()).toEqual(['A', 'B']);
  });

  it('elements() snapshot is not affected by later mutations', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    r.add(a);
    const snap = r.elements();
    r.add(mkPartDef('B'));
    expect(snap).toHaveLength(1);
  });
});

describe('ElementRegistry — addEdge / getEdge / removeEdge', () => {
  it('addEdge stores an edge retrievable by id', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    r.add(a);
    r.add(b);
    const e = mkComposition(a.id, b.id);
    r.addEdge(e);
    expect(r.getEdge(e.id)).toEqual(e);
  });

  it('addEdge throws on duplicate id', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    r.add(a);
    r.add(b);
    const e1 = mkComposition(a.id, b.id, mkEdgeId('dup'));
    const e2 = mkComposition(b.id, a.id, mkEdgeId('dup'));
    r.addEdge(e1);
    expect(() => r.addEdge(e2)).toThrowError(/duplicate/i);
  });

  it('addEdge throws when the source endpoint is missing', () => {
    const r = createElementRegistry();
    const b = mkPartDef('B');
    r.add(b);
    expect(() =>
      r.addEdge(mkComposition(mkElementId('missing'), b.id)),
    ).toThrowError(/source/i);
  });

  it('addEdge throws when the target endpoint is missing', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    r.add(a);
    expect(() =>
      r.addEdge(mkComposition(a.id, mkElementId('missing'))),
    ).toThrowError(/target/i);
  });

  it('removeEdge deletes the edge and is idempotent', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    r.add(a);
    r.add(b);
    const e = mkComposition(a.id, b.id);
    r.addEdge(e);
    r.removeEdge(e.id);
    expect(r.getEdge(e.id)).toBeUndefined();
    expect(() => r.removeEdge(e.id)).not.toThrow();
  });

  it('removing an element removes all incident edges', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const c = mkPartDef('C');
    r.add(a);
    r.add(b);
    r.add(c);
    const ab = mkComposition(a.id, b.id);
    const bc = mkComposition(b.id, c.id);
    const ac = mkComposition(a.id, c.id);
    r.addEdge(ab);
    r.addEdge(bc);
    r.addEdge(ac);
    r.remove(b.id);
    expect(r.getEdge(ab.id)).toBeUndefined();
    expect(r.getEdge(bc.id)).toBeUndefined();
    expect(r.getEdge(ac.id)).toEqual(ac);
    expect(r.edges()).toHaveLength(1);
  });
});

describe('ElementRegistry — update', () => {
  it('updates fields of an element of the given kind', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    r.update<'PartDefinition'>(v.id, { name: 'Car', isAbstract: true });
    const after = r.get(v.id) as PartDefinitionElement;
    expect(after.name).toBe('Car');
    expect(after.isAbstract).toBe(true);
  });

  it('preserves id and kind across updates', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    r.update<'PartDefinition'>(v.id, { name: 'Car' });
    const after = r.get(v.id);
    expect(after?.id).toBe(v.id);
    expect(after?.kind).toBe('PartDefinition');
  });

  it('throws when id does not exist', () => {
    const r = createElementRegistry();
    expect(() =>
      r.update<'PartDefinition'>(mkElementId('missing'), { name: 'X' }),
    ).toThrowError(/not found/i);
  });

  it('throws when the existing kind does not match K', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    expect(() =>
      r.update<'Requirement'>(v.id, {
        text: 'will not apply',
      } as Partial<Omit<RequirementElement, 'id' | 'kind'>>),
    ).toThrowError(/kind/i);
  });

  it('updates do not affect snapshots taken before the call', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    const before = r.elements();
    r.update<'PartDefinition'>(v.id, { name: 'Car' });
    const beforeAgain = before.find((e): e is PartDefinitionElement =>
      e.kind === 'PartDefinition',
    );
    expect(beforeAgain?.name).toBe('Vehicle');
  });

  it('accepts optional base fields (documentation, ownerId) even when the instance has none set', () => {
    const r = createElementRegistry();
    const v = mkPartDef('Vehicle');
    r.add(v);
    expect(() =>
      r.update<'PartDefinition'>(v.id, { documentation: 'A car block' }),
    ).not.toThrow();
    const after = r.get(v.id);
    expect(after?.documentation).toBe('A car block');
  });

  it('setting an optional base field to undefined clears it without throwing', () => {
    const r = createElementRegistry();
    const v: PartDefinitionElement = {
      ...mkPartDef('Vehicle'),
      documentation: 'old',
    };
    r.add(v);
    r.update<'PartDefinition'>(v.id, { documentation: undefined });
    expect(r.get(v.id)?.documentation).toBeUndefined();
  });
});

describe('ElementRegistry — checkIntegrity', () => {
  it('returns empty findings for a registry built only via the safe API', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    r.add(a);
    r.add(b);
    r.addEdge(mkComposition(a.id, b.id));
    const result = r.checkIntegrity();
    expect(result.duplicateElementIds).toEqual([]);
    expect(result.duplicateEdgeIds).toEqual([]);
    expect(result.danglingEdges).toEqual([]);
    expect(result.danglingElementRefs).toEqual([]);
  });

  it('reports dangling source/target on element-level connections', () => {
    const r = createElementRegistry();
    const a = mkPartDef('A');
    r.add(a);
    const orphan: ModelElement = {
      id: createElementId(),
      kind: 'ConnectionUsage',
      name: 'orphan',
      sourceId: a.id,
      targetId: mkElementId('does-not-exist'),
    };
    r.add(orphan);
    const result = r.checkIntegrity();
    expect(result.danglingElementRefs).toHaveLength(1);
    expect(result.danglingElementRefs[0]).toMatchObject({
      elementId: orphan.id,
      missingId: 'does-not-exist',
      role: 'target',
    });
  });
});
