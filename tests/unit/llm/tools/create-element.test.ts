import { describe, expect, it } from 'vitest';
import {
  createElementHandler,
  createElementSchema,
} from '@/llm/tools/create-element';
import { createProjectReader } from '@/llm/project-reader';
import type { ElementId } from '@/model';
import type { ModelElement, PackageElement } from '@/model';

const pkg: PackageElement = {
  id: 'pkg-1' as ElementId,
  kind: 'Package',
  name: 'Root',
  memberIds: ['existing-1' as ElementId],
};

const reader = createProjectReader({
  projectName: 'Test',
  elements: [pkg] as readonly ModelElement[],
  edges: [],
  diagrams: [],
  activeDiagramId: null,
});

describe('create_element tool', () => {
  it('returns a proposed-change with a single create-element command for a PartDefinition', async () => {
    const input = createElementSchema.parse({
      kind: 'PartDefinition',
      name: 'Engine',
      documentation: 'Provides motive power',
    });

    const output = await createElementHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;
    expect(output.change.commands).toHaveLength(1);
    const [cmd] = output.change.commands;
    expect(cmd?.kind).toBe('create-element');
    if (cmd?.kind !== 'create-element') return;
    expect(cmd.element.kind).toBe('PartDefinition');
    expect(cmd.element.name).toBe('Engine');
    expect(cmd.element.documentation).toBe('Provides motive power');
    expect(output.change.id).toBe(cmd.element.id);
    expect(output.change.summary).toContain('PartDefinition');
    expect(output.change.summary).toContain('Engine');
  });

  it('chains an update-element command when owningPackageId refers to a Package', async () => {
    const input = createElementSchema.parse({
      kind: 'PartDefinition',
      name: 'Pump',
      owningPackageId: 'pkg-1',
    });

    const output = await createElementHandler(input, { conversationId: 'c1' }, reader);
    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;

    expect(output.change.commands).toHaveLength(2);
    const [createCmd, updateCmd] = output.change.commands;
    expect(createCmd?.kind).toBe('create-element');
    expect(updateCmd?.kind).toBe('update-element');
    if (updateCmd?.kind !== 'update-element') return;
    if (createCmd?.kind !== 'create-element') return;

    expect(updateCmd.id).toBe(pkg.id);
    expect(updateCmd.patch.memberIds).toEqual([
      ...pkg.memberIds,
      createCmd.element.id,
    ]);
  });

  it('builds a Requirement with defaults when only "text" is supplied', async () => {
    const input = createElementSchema.parse({
      kind: 'Requirement',
      name: 'Cooling',
      requirement: { text: 'System shall remain under 80°C' },
    });

    const output = await createElementHandler(input, { conversationId: 'c1' }, reader);
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    const [cmd] = output.change.commands;
    if (cmd?.kind !== 'create-element' || cmd.element.kind !== 'Requirement') {
      throw new Error('expected Requirement create-element');
    }
    expect(cmd.element.text).toBe('System shall remain under 80°C');
    expect(cmd.element.priority).toBe('medium');
    expect(cmd.element.status).toBe('draft');
    expect(cmd.element.reqId).toBeUndefined();
  });

  it('throws when kind="Requirement" but no "requirement" field provided', async () => {
    const input = createElementSchema.parse({ kind: 'Requirement', name: 'Bad' });
    await expect(
      createElementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/requirement/);
  });

  it('throws when owningPackageId refers to a non-existent element', async () => {
    const input = createElementSchema.parse({
      kind: 'Actor',
      name: 'Operator',
      owningPackageId: 'pkg-missing',
    });
    await expect(
      createElementHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/does not refer/);
  });

  it('throws when owningPackageId refers to an element that is not a Package', async () => {
    const nonPkgReader = createProjectReader({
      projectName: 'Test',
      elements: [
        {
          id: 'part-1' as ElementId,
          kind: 'PartDefinition',
          name: 'X',
          isAbstract: false,
          propertyIds: [],
          portIds: [],
        },
      ] as readonly ModelElement[],
      edges: [],
      diagrams: [],
      activeDiagramId: null,
    });
    const input = createElementSchema.parse({
      kind: 'Actor',
      name: 'Operator',
      owningPackageId: 'part-1',
    });
    await expect(
      createElementHandler(input, { conversationId: 'c1' }, nonPkgReader),
    ).rejects.toThrow(/not a Package/);
  });

  it('rejects unknown kinds at schema parse time', () => {
    expect(() =>
      createElementSchema.parse({ kind: 'ItemFlow', name: 'flow' }),
    ).toThrow();
  });

  it('rejects extra top-level properties (strict schema)', () => {
    expect(() =>
      createElementSchema.parse({ kind: 'Package', name: 'P', bogus: true }),
    ).toThrow();
  });
});
