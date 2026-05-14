import { describe, expect, it } from 'vitest';
import {
  proposeDecompositionHandler,
  proposeDecompositionSchema,
} from '@/llm/tools/propose-decomposition';
import { createProjectReader } from '@/llm/project-reader';
import type {
  CompositionEdge,
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  PackageElement,
  PartDefinitionElement,
} from '@/model';

function part(id: string, name: string): PartDefinitionElement {
  return {
    id: id as ElementId,
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    isAbstract: false,
  };
}

function readerWith(elements: readonly ModelElement[], edges: readonly ModelEdge[] = []) {
  return createProjectReader({
    rootId: 'root-pkg' as ElementId,
    projectName: 'Test',
    elements,
    edges,
    diagrams: [],
    activeDiagramId: null,
  });
}

const ctx = { conversationId: 'c1' };

describe('propose_decomposition tool', () => {
  it('returns a proposed-change with one create-element + one Composition link per child', async () => {
    const parent = part('parent-1', 'Vehicle');
    const reader = readerWith([parent]);

    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'parent-1',
      childNames: ['Engine', 'Wheel', 'Chassis'],
    });

    const output = await proposeDecompositionHandler(input, ctx, reader);
    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;

    expect(output.change.commands).toHaveLength(6);

    const created: PartDefinitionElement[] = [];
    const links: CompositionEdge[] = [];
    for (const cmd of output.change.commands) {
      if (cmd.kind === 'create-element' && cmd.element.kind === 'PartDefinition') {
        created.push(cmd.element);
      } else if (cmd.kind === 'link' && cmd.edge.kind === 'Composition') {
        links.push(cmd.edge);
      }
    }
    expect(created.map((p) => p.name)).toEqual(['Engine', 'Wheel', 'Chassis']);
    expect(links).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(links[i]?.sourceId).toBe(parent.id);
      expect(links[i]?.targetId).toBe(created[i]?.id);
    }
    expect(output.change.summary).toContain('Vehicle');
    expect(output.change.summary).toContain('3');
    expect(output.change.id).toBe(created[0]?.id);
  });

  it('singularises summary when only one child is created', async () => {
    const parent = part('p', 'Pump');
    const reader = readerWith([parent]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['Impeller'],
    });
    const output = await proposeDecompositionHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.summary).toBe('Decompose "Pump" into 1 child PartDefinition');
  });

  it('throws when parentPartDefinitionId is missing', async () => {
    const reader = readerWith([]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'nope',
      childNames: ['Engine'],
    });
    await expect(proposeDecompositionHandler(input, ctx, reader)).rejects.toThrow(/does not refer/);
  });

  it('throws when parent refers to a non-PartDefinition element', async () => {
    const pkg: PackageElement = {
      id: 'pkg-1' as ElementId,
      kind: 'Package',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'P',
    };
    const reader = readerWith([pkg]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'pkg-1',
      childNames: ['Engine'],
    });
    await expect(proposeDecompositionHandler(input, ctx, reader)).rejects.toThrow(/not a PartDefinition/);
  });

  it('rejects duplicate child names (case-insensitive)', async () => {
    const parent = part('p', 'Vehicle');
    const reader = readerWith([parent]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['Engine', 'engine'],
    });
    await expect(proposeDecompositionHandler(input, ctx, reader)).rejects.toThrow(/Duplicate child name/);
  });

  it('rejects child names that collide with an existing direct composition child', async () => {
    const parent = part('p', 'Vehicle');
    const existingChild = part('c', 'engine');
    const edge: CompositionEdge = {
      id: 'e1' as EdgeId,
      kind: 'Composition',
      sourceId: parent.id,
      targetId: existingChild.id,
    };
    const reader = readerWith([parent, existingChild], [edge]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['Engine'],
    });
    await expect(proposeDecompositionHandler(input, ctx, reader)).rejects.toThrow(/already composed/);
  });

  it('does NOT collide with same-named child of a different parent', async () => {
    const parent = part('p', 'Vehicle');
    const other = part('o', 'Truck');
    const otherChild = part('c', 'Engine');
    const edge: CompositionEdge = {
      id: 'e1' as EdgeId,
      kind: 'Composition',
      sourceId: other.id,
      targetId: otherChild.id,
    };
    const reader = readerWith([parent, other, otherChild], [edge]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['Engine'],
    });
    const output = await proposeDecompositionHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.commands).toHaveLength(2);
  });

  it('trims whitespace from child names', async () => {
    const parent = part('p', 'Vehicle');
    const reader = readerWith([parent]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['  Engine  '],
    });
    const output = await proposeDecompositionHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    const cmd = output.change.commands[0];
    if (cmd?.kind !== 'create-element' || cmd.element.kind !== 'PartDefinition') {
      throw new Error('expected create-element of PartDefinition');
    }
    expect(cmd.element.name).toBe('Engine');
  });

  it('rejects empty childNames array at schema parse time', () => {
    expect(() =>
      proposeDecompositionSchema.parse({
        parentPartDefinitionId: 'p',
        childNames: [],
      }),
    ).toThrow();
  });

  it('rejects more than 20 children at schema parse time', () => {
    const many = Array.from({ length: 21 }, (_, i) => `Child${i}`);
    expect(() =>
      proposeDecompositionSchema.parse({
        parentPartDefinitionId: 'p',
        childNames: many,
      }),
    ).toThrow();
  });

  it('rejects child name longer than 120 chars at schema parse time', () => {
    expect(() =>
      proposeDecompositionSchema.parse({
        parentPartDefinitionId: 'p',
        childNames: ['x'.repeat(121)],
      }),
    ).toThrow();
  });

  it('rejects extra top-level properties (strict schema)', () => {
    expect(() =>
      proposeDecompositionSchema.parse({
        parentPartDefinitionId: 'p',
        childNames: ['Engine'],
        extra: 1,
      }),
    ).toThrow();
  });

  it('emits stable, unique element + edge ids across created children', async () => {
    const parent = part('p', 'Vehicle');
    const reader = readerWith([parent]);
    const input = proposeDecompositionSchema.parse({
      parentPartDefinitionId: 'p',
      childNames: ['A', 'B', 'C'],
    });
    const output = await proposeDecompositionHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    const elementIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const cmd of output.change.commands) {
      if (cmd.kind === 'create-element') elementIds.add(cmd.element.id);
      else if (cmd.kind === 'link') edgeIds.add(cmd.edge.id);
    }
    expect(elementIds.size).toBe(3);
    expect(edgeIds.size).toBe(3);
  });
});
