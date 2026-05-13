import { describe, expect, it } from 'vitest';
import {
  suggestMissingElementsHandler,
  suggestMissingElementsSchema,
} from '@/llm/tools/suggest-missing-elements';
import { createProjectReader } from '@/llm/project-reader';
import type {
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  PackageElement,
  PartDefinitionElement,
  RequirementElement,
  RequirementTraceEdge,
} from '@/model';

function part(id: string, name: string): PartDefinitionElement {
  return {
    id: id as ElementId,
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

function req(id: string, name: string): RequirementElement {
  return {
    id: id as ElementId,
    kind: 'Requirement',
    name,
    text: `${name} text`,
    priority: 'medium',
    status: 'draft',
  };
}

function readerWith(elements: readonly ModelElement[], edges: readonly ModelEdge[] = []) {
  return createProjectReader({
    projectName: 'Test',
    elements,
    edges,
    diagrams: [],
    activeDiagramId: null,
  });
}

const ctx = { conversationId: 'c1' };

describe('suggest_missing_elements tool', () => {
  it('proposes a Requirement + satisfy trace for each un-required PartDefinition', async () => {
    const a = part('a', 'Engine');
    const b = part('b', 'Wheel');
    const reader = readerWith([a, b]);

    const input = suggestMissingElementsSchema.parse({});
    const output = await suggestMissingElementsHandler(input, ctx, reader);
    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;

    expect(output.change.commands).toHaveLength(4);

    const created: RequirementElement[] = [];
    const links: RequirementTraceEdge[] = [];
    for (const cmd of output.change.commands) {
      if (cmd.kind === 'create-element' && cmd.element.kind === 'Requirement') {
        created.push(cmd.element);
      } else if (cmd.kind === 'link' && cmd.edge.kind === 'RequirementTrace') {
        links.push(cmd.edge);
      }
    }
    expect(created).toHaveLength(2);
    expect(created[0]?.name).toBe('Engine requirement');
    expect(created[1]?.name).toBe('Wheel requirement');
    expect(created[0]?.priority).toBe('medium');
    expect(created[0]?.status).toBe('draft');
    expect(created[0]?.text).toContain('Engine');

    expect(links).toHaveLength(2);
    expect(links[0]?.traceKind).toBe('satisfy');
    expect(links[0]?.sourceId).toBe(created[0]?.id);
    expect(links[0]?.targetId).toBe(a.id);
    expect(links[1]?.targetId).toBe(b.id);

    expect(output.change.id).toBe(created[0]?.id);
    expect(output.change.summary).toContain('2');
  });

  it('skips PartDefinitions that already have an incoming RequirementTrace edge (any kind)', async () => {
    const a = part('a', 'Engine');
    const b = part('b', 'Wheel');
    const r = req('r', 'R1');
    const verifyTrace: RequirementTraceEdge = {
      id: 'e1' as EdgeId,
      kind: 'RequirementTrace',
      sourceId: r.id,
      targetId: a.id,
      traceKind: 'verify',
    };
    const reader = readerWith([a, b, r], [verifyTrace]);

    const input = suggestMissingElementsSchema.parse({});
    const output = await suggestMissingElementsHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.commands).toHaveLength(2);
    const cmd = output.change.commands[0];
    if (cmd?.kind !== 'create-element' || cmd.element.kind !== 'Requirement') {
      throw new Error('expected create-element of Requirement');
    }
    expect(cmd.element.name).toBe('Wheel requirement');
  });

  it('throws when every PartDefinition is already required', async () => {
    const a = part('a', 'Engine');
    const r = req('r', 'R1');
    const trace: RequirementTraceEdge = {
      id: 'e1' as EdgeId,
      kind: 'RequirementTrace',
      sourceId: r.id,
      targetId: a.id,
      traceKind: 'satisfy',
    };
    const reader = readerWith([a, r], [trace]);
    await expect(
      suggestMissingElementsHandler(suggestMissingElementsSchema.parse({}), ctx, reader),
    ).rejects.toThrow(/no un-required/i);
  });

  it('throws when the model contains no PartDefinitions at all', async () => {
    const reader = readerWith([]);
    await expect(
      suggestMissingElementsHandler(suggestMissingElementsSchema.parse({}), ctx, reader),
    ).rejects.toThrow(/no un-required/i);
  });

  it('caps the number of suggestions at maxSuggestions', async () => {
    const parts = Array.from({ length: 10 }, (_, i) => part(`p${i}`, `Part${i}`));
    const reader = readerWith(parts);
    const input = suggestMissingElementsSchema.parse({ maxSuggestions: 3 });
    const output = await suggestMissingElementsHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.commands).toHaveLength(6);
    expect(output.change.summary).toContain('3');
  });

  it('defaults maxSuggestions to 5', async () => {
    const parts = Array.from({ length: 8 }, (_, i) => part(`p${i}`, `Part${i}`));
    const reader = readerWith(parts);
    const output = await suggestMissingElementsHandler(
      suggestMissingElementsSchema.parse({}),
      ctx,
      reader,
    );
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.commands).toHaveLength(10);
  });

  it('appends new requirement ids to the owning package memberIds', async () => {
    const a = part('a', 'Engine');
    const pkg: PackageElement = {
      id: 'pkg-1' as ElementId,
      kind: 'Package',
      name: 'Reqs',
      memberIds: ['existing' as ElementId],
    };
    const reader = readerWith([a, pkg]);
    const input = suggestMissingElementsSchema.parse({ owningPackageId: 'pkg-1' });
    const output = await suggestMissingElementsHandler(input, ctx, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');

    const newReq = output.change.commands.find(
      (c) => c.kind === 'create-element' && c.element.kind === 'Requirement',
    );
    if (newReq?.kind !== 'create-element') throw new Error('expected create-element');
    const update = output.change.commands.find((c) => c.kind === 'update-element');
    if (update?.kind !== 'update-element') throw new Error('expected update-element');
    expect(update.id).toBe('pkg-1');
    expect(update.patch.memberIds).toEqual(['existing', newReq.element.id]);
    expect(output.change.summary).toContain('pkg-1');
  });

  it('throws when owningPackageId does not refer to an existing element', async () => {
    const a = part('a', 'Engine');
    const reader = readerWith([a]);
    const input = suggestMissingElementsSchema.parse({ owningPackageId: 'nope' });
    await expect(suggestMissingElementsHandler(input, ctx, reader)).rejects.toThrow(/does not refer/);
  });

  it('throws when owningPackageId refers to a non-Package element', async () => {
    const a = part('a', 'Engine');
    const reader = readerWith([a]);
    const input = suggestMissingElementsSchema.parse({ owningPackageId: 'a' });
    await expect(suggestMissingElementsHandler(input, ctx, reader)).rejects.toThrow(/not a Package/);
  });

  it('rejects maxSuggestions outside [1, 20] at schema parse time', () => {
    expect(() => suggestMissingElementsSchema.parse({ maxSuggestions: 0 })).toThrow();
    expect(() => suggestMissingElementsSchema.parse({ maxSuggestions: 21 })).toThrow();
    expect(() => suggestMissingElementsSchema.parse({ maxSuggestions: 1.5 })).toThrow();
  });

  it('rejects extra top-level properties (strict schema)', () => {
    expect(() =>
      suggestMissingElementsSchema.parse({ extra: 1 }),
    ).toThrow();
  });

  it('emits unique element + edge ids', async () => {
    const parts = [part('a', 'A'), part('b', 'B'), part('c', 'C')];
    const reader = readerWith(parts);
    const output = await suggestMissingElementsHandler(
      suggestMissingElementsSchema.parse({}),
      ctx,
      reader,
    );
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
