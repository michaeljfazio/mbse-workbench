import { describe, expect, it } from 'vitest';

import { migrateLegacyProject } from '@/repository/migrate';

describe('migrateLegacyProject — diagram context migration (T-13.30)', () => {
  it('synthesizes { kind: "package", id: rootId } on context-less legacy diagrams', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-11T00:00:00.000Z',
      modifiedAt: '2026-05-11T00:00:00.000Z',
      elements: [
        { id: 'root', kind: 'Package', name: 'p' },
        { id: 'd', kind: 'PartDefinition', name: 'Engine', isAbstract: false },
      ],
      edges: [],
      diagrams: [
        { id: 'dg1', viewpointId: 'bdd', name: 'Main BDD', positions: {} },
      ],
    });

    expect(project.diagrams).toHaveLength(1);
    expect(project.diagrams[0]!.context).toEqual({
      kind: 'package',
      id: project.rootId,
    });
  });

  it('preserves an existing diagram context when one is already present', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-11T00:00:00.000Z',
      modifiedAt: '2026-05-11T00:00:00.000Z',
      elements: [
        { id: 'root', kind: 'Package', name: 'p' },
        { id: 'engine', kind: 'PartDefinition', name: 'Engine', isAbstract: false },
      ],
      edges: [],
      diagrams: [
        {
          id: 'dg1',
          viewpointId: 'ibd',
          name: 'Engine IBD',
          positions: {},
          context: { kind: 'partDefinition', id: 'engine' },
        },
      ],
    });

    expect(project.diagrams[0]!.context).toEqual({
      kind: 'partDefinition',
      id: 'engine',
    });
  });

  it('points the synthesized default at the synthesized root when no root existed', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'Untitled',
      createdAt: '2026-05-11T00:00:00.000Z',
      modifiedAt: '2026-05-11T00:00:00.000Z',
      elements: [
        { id: 'orphan', kind: 'PartDefinition', name: 'Lone', isAbstract: false },
      ],
      edges: [],
      diagrams: [
        { id: 'dg1', viewpointId: 'bdd', name: 'BDD', positions: {} },
      ],
    });

    expect(project.diagrams[0]!.context).toEqual({
      kind: 'package',
      id: project.rootId,
    });
  });
});
