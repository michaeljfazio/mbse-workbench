import { describe, expect, it } from 'vitest';
import {
  generateRequirementsFromTextHandler,
  generateRequirementsFromTextSchema,
  parseRequirementLines,
} from '@/llm/tools/generate-requirements-from-text';
import { createProjectReader } from '@/llm/project-reader';
import type {
  ElementId,
  ModelElement,
  PackageElement,
  PartDefinitionElement,
} from '@/model';

function readerWith(elements: readonly ModelElement[]) {
  return createProjectReader({
    rootId: 'root-pkg' as ElementId,
    projectName: 'Test',
    elements,
    edges: [],
    diagrams: [],
    activeDiagramId: null,
  });
}

describe('parseRequirementLines', () => {
  it('splits non-empty lines into entries', () => {
    const out = parseRequirementLines('first req\nsecond req\nthird req');
    expect(out).toHaveLength(3);
    expect(out[0]?.text).toBe('first req');
    expect(out[1]?.text).toBe('second req');
    expect(out[2]?.text).toBe('third req');
  });

  it('strips bullet markers (-, *, •, 1., 1))', () => {
    const out = parseRequirementLines('- alpha\n* beta\n• gamma\n1. delta\n2) epsilon');
    expect(out.map((r) => r.text)).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('drops blank lines and lines shorter than 3 chars', () => {
    const out = parseRequirementLines('one good line\n\n  \nab\n  another good line');
    expect(out.map((r) => r.text)).toEqual(['one good line', 'another good line']);
  });

  it('derives a short name from the first sentence', () => {
    const out = parseRequirementLines(
      'The system shall remain operational. Even during a power outage.',
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe('The system shall remain operational');
    expect(out[0]?.text).toBe(
      'The system shall remain operational. Even during a power outage.',
    );
  });

  it('truncates long names with an ellipsis at a word boundary', () => {
    const long =
      'The cooling subsystem shall maintain core temperature below eighty degrees Celsius under nominal load conditions for at least eight hours of continuous operation';
    const out = parseRequirementLines(long);
    const name = out[0]?.name ?? '';
    expect(name.length).toBeLessThanOrEqual(60);
    expect(name.endsWith('…')).toBe(true);
    expect(name).not.toMatch(/\s…$/);
  });
});

describe('generate_requirements_from_text tool', () => {
  it('returns a proposed-change with one create-element command per line', async () => {
    const reader = readerWith([]);
    const input = generateRequirementsFromTextSchema.parse({
      text: '- The system shall boot in under 5s\n- The system shall log errors\n- The UI shall be accessible',
    });

    const output = await generateRequirementsFromTextHandler(
      input,
      { conversationId: 'c1' },
      reader,
    );
    expect(output.kind).toBe('proposed-change');
    if (output.kind !== 'proposed-change') return;
    expect(output.change.commands).toHaveLength(3);
    for (const cmd of output.change.commands) {
      expect(cmd.kind).toBe('create-element');
      if (cmd.kind !== 'create-element') continue;
      expect(cmd.element.kind).toBe('Requirement');
    }
    expect(output.change.summary).toContain('3 requirements');
    expect(output.change.id).toBe(
      output.change.commands[0]?.kind === 'create-element'
        ? output.change.commands[0].element.id
        : null,
    );
  });

  it('applies defaultPriority and defaultStatus to every requirement', async () => {
    const reader = readerWith([]);
    const input = generateRequirementsFromTextSchema.parse({
      text: 'req one\nreq two',
      defaultPriority: 'high',
      defaultStatus: 'approved',
    });

    const output = await generateRequirementsFromTextHandler(
      input,
      { conversationId: 'c1' },
      reader,
    );
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    for (const cmd of output.change.commands) {
      if (cmd.kind !== 'create-element' || cmd.element.kind !== 'Requirement') continue;
      expect(cmd.element.priority).toBe('high');
      expect(cmd.element.status).toBe('approved');
    }
  });

  it('defaults to medium / draft when not specified', async () => {
    const reader = readerWith([]);
    const input = generateRequirementsFromTextSchema.parse({ text: 'just one req' });
    const output = await generateRequirementsFromTextHandler(
      input,
      { conversationId: 'c1' },
      reader,
    );
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    const cmd = output.change.commands[0];
    if (cmd?.kind !== 'create-element' || cmd.element.kind !== 'Requirement') {
      throw new Error('expected create-element of Requirement');
    }
    expect(cmd.element.priority).toBe('medium');
    expect(cmd.element.status).toBe('draft');
  });

  it('assigns ownerId to the owning package on every created requirement', async () => {
    const pkg: PackageElement = {
      id: 'pkg-1' as ElementId,
      kind: 'Package',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Requirements',
    };
    const reader = readerWith([pkg]);

    const input = generateRequirementsFromTextSchema.parse({
      text: 'req one\nreq two',
      owningPackageId: 'pkg-1',
    });
    const output = await generateRequirementsFromTextHandler(
      input,
      { conversationId: 'c1' },
      reader,
    );
    if (output.kind !== 'proposed-change') throw new Error('expected proposed-change');
    expect(output.change.commands).toHaveLength(2);
    for (const cmd of output.change.commands) {
      if (cmd.kind !== 'create-element') throw new Error('expected create-element');
      expect(cmd.element.ownerId).toBe(pkg.id);
      expect(cmd.element.ownerRole).toBe('member');
    }
    expect(output.change.summary).toContain('pkg-1');
  });

  it('throws when owningPackageId is missing', async () => {
    const reader = readerWith([]);
    const input = generateRequirementsFromTextSchema.parse({
      text: 'a requirement',
      owningPackageId: 'nope',
    });
    await expect(
      generateRequirementsFromTextHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/does not refer/);
  });

  it('throws when owningPackageId refers to a non-Package element', async () => {
    const part: PartDefinitionElement = {
      id: 'part-1' as ElementId,
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Radiator',
      isAbstract: false,
    };
    const reader = readerWith([part]);
    const input = generateRequirementsFromTextSchema.parse({
      text: 'a requirement',
      owningPackageId: 'part-1',
    });
    await expect(
      generateRequirementsFromTextHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/not a Package/);
  });

  it('throws when no lines can be parsed', async () => {
    const reader = readerWith([]);
    const input = generateRequirementsFromTextSchema.parse({ text: '   \n\n  \n' });
    await expect(
      generateRequirementsFromTextHandler(input, { conversationId: 'c1' }, reader),
    ).rejects.toThrow(/No requirement lines/);
  });

  it('rejects unknown defaultPriority / defaultStatus at schema parse time', () => {
    expect(() =>
      generateRequirementsFromTextSchema.parse({ text: 'r', defaultPriority: 'urgent' }),
    ).toThrow();
    expect(() =>
      generateRequirementsFromTextSchema.parse({ text: 'r', defaultStatus: 'open' }),
    ).toThrow();
  });

  it('rejects extra top-level properties (strict schema)', () => {
    expect(() =>
      generateRequirementsFromTextSchema.parse({ text: 'r', extra: 1 }),
    ).toThrow();
  });
});
