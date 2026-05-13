import { describe, expect, it } from 'vitest';
import {
  linkRequirementHandler,
  linkRequirementSchema,
} from '@/llm/tools/link-requirement';
import { createProjectReader } from '@/llm/project-reader';
import type {
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  PartDefinitionElement,
  RequirementElement,
  RequirementTraceEdge,
} from '@/model';

const req: RequirementElement = {
  id: 'req-1' as ElementId,
  kind: 'Requirement',
  name: 'Cooling',
  text: 'System shall remain under 80°C',
  priority: 'medium',
  status: 'draft',
};

const part: PartDefinitionElement = {
  id: 'part-1' as ElementId,
  kind: 'PartDefinition',
  name: 'Radiator',
  isAbstract: false,
  propertyIds: [],
  portIds: [],
};

function readerWith(elements: readonly ModelElement[], edges: readonly ModelEdge[] = []) {
  return createProjectReader({
    projectName: 'Test',
    elements,
    edges,
    diagrams: [],
    activeDiagramId: null,
  });
}

describe('link_requirement tool', () => {
  it('returns a proposed-change with a single link command for a satisfy trace', async () => {
    const reader = readerWith([req, part]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-1',
      targetId: 'part-1',
      traceKind: 'satisfy',
    });

    const output = await linkRequirementHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;
    expect(output.change.commands).toHaveLength(1);
    const [cmd] = output.change.commands;
    expect(cmd?.kind).toBe('link');
    if (cmd?.kind !== 'link') return;
    expect(cmd.edge.kind).toBe('RequirementTrace');
    if (cmd.edge.kind !== 'RequirementTrace') return;
    expect(cmd.edge.sourceId).toBe(req.id);
    expect(cmd.edge.targetId).toBe(part.id);
    expect(cmd.edge.traceKind).toBe('satisfy');
    expect(output.change.id).toBe(cmd.edge.id);
    expect(output.change.summary).toContain('Cooling');
    expect(output.change.summary).toContain('Radiator');
    expect(output.change.summary).toContain('satisfy');
  });

  it('supports verify, derive, and refine trace kinds', async () => {
    const reader = readerWith([req, part]);
    for (const traceKind of ['verify', 'derive', 'refine'] as const) {
      const input = linkRequirementSchema.parse({
        requirementId: 'req-1',
        targetId: 'part-1',
        traceKind,
      });
      const output = await linkRequirementHandler(input, { conversationId: 'c1' }, reader);
      if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
      const [cmd] = output.change.commands;
      if (cmd?.kind !== 'link' || cmd.edge.kind !== 'RequirementTrace') {
        throw new Error('expected RequirementTrace link');
      }
      expect(cmd.edge.traceKind).toBe(traceKind);
    }
  });

  it('throws when requirementId does not refer to an existing element', async () => {
    const reader = readerWith([part]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-missing',
      targetId: 'part-1',
      traceKind: 'satisfy',
    });
    await expect(
      linkRequirementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/does not refer/);
  });

  it('throws when requirementId refers to a non-Requirement element', async () => {
    const reader = readerWith([part, { ...req, id: 'other' as ElementId, name: 'Other' }]);
    const input = linkRequirementSchema.parse({
      requirementId: 'part-1',
      targetId: 'other',
      traceKind: 'satisfy',
    });
    await expect(
      linkRequirementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/not a Requirement/);
  });

  it('throws when targetId does not refer to an existing element', async () => {
    const reader = readerWith([req]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-1',
      targetId: 'nope',
      traceKind: 'satisfy',
    });
    await expect(
      linkRequirementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/targetId.*does not refer/);
  });

  it('throws when linking a requirement to itself', async () => {
    const reader = readerWith([req]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-1',
      targetId: 'req-1',
      traceKind: 'derive',
    });
    await expect(
      linkRequirementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/itself/);
  });

  it('throws when an identical trace already exists', async () => {
    const existing: RequirementTraceEdge = {
      id: 'edge-existing' as EdgeId,
      kind: 'RequirementTrace',
      sourceId: req.id,
      targetId: part.id,
      traceKind: 'satisfy',
    };
    const reader = readerWith([req, part], [existing]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-1',
      targetId: 'part-1',
      traceKind: 'satisfy',
    });
    await expect(
      linkRequirementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/already exists/);
  });

  it('allows a second trace of a different kind between the same pair', async () => {
    const existing: RequirementTraceEdge = {
      id: 'edge-existing' as EdgeId,
      kind: 'RequirementTrace',
      sourceId: req.id,
      targetId: part.id,
      traceKind: 'satisfy',
    };
    const reader = readerWith([req, part], [existing]);
    const input = linkRequirementSchema.parse({
      requirementId: 'req-1',
      targetId: 'part-1',
      traceKind: 'verify',
    });
    const output = await linkRequirementHandler(input, { conversationId: 'c1' }, reader);
    expect(output.kind).toBe('proposed-change');
  });

  it('rejects unknown traceKind at schema parse time', () => {
    expect(() =>
      linkRequirementSchema.parse({
        requirementId: 'r',
        targetId: 't',
        traceKind: 'bogus',
      }),
    ).toThrow();
  });

  it('rejects extra top-level properties (strict schema)', () => {
    expect(() =>
      linkRequirementSchema.parse({
        requirementId: 'r',
        targetId: 't',
        traceKind: 'satisfy',
        extra: 1,
      }),
    ).toThrow();
  });
});
