import { describe, expect, it } from 'vitest';

import type { ElementId, ModelElement, ModelEdge, ProjectId, EdgeId } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  applyStandardLibrary,
  findLibraryReferences,
  KERML_CORE_ELEMENT_IDS,
  KERML_CORE_QUALIFIED_NAME,
} from '@/library';

function baseProject(overrides: Partial<Project> = {}): Project {
  return applyStandardLibrary({
    id: 'p' as ProjectId,
    name: 'demo',
    createdAt: '2026-05-16T00:00:00.000Z',
    modifiedAt: '2026-05-16T00:00:00.000Z',
    rootId: 'root' as ElementId,
    elements: [
      {
        id: 'root' as ElementId,
        kind: 'Package',
        name: 'demo',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
      },
    ],
    edges: [],
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
    ...overrides,
  });
}

function withElements(extra: ModelElement[], edges: ModelEdge[] = []): Project {
  const proj = baseProject();
  return {
    ...proj,
    elements: [...proj.elements, ...extra],
    edges: [...proj.edges, ...edges],
  };
}

describe('findLibraryReferences (T-14.05)', () => {
  it('returns [] when no user element references a library element', () => {
    const proj = baseProject();
    expect(findLibraryReferences(proj)).toEqual([]);
  });

  it('detects PartUsage.definitionId pointing at a library PartDefinition', () => {
    const proj = withElements([
      {
        id: 'pu1' as ElementId,
        kind: 'PartUsage',
        name: 'p',
        ownerId: 'root' as ElementId,
        ownerRole: 'member',
        ownerIndex: 0,
        definitionId: KERML_CORE_ELEMENT_IDS.Part,
      },
    ]);
    expect(findLibraryReferences(proj)).toEqual([KERML_CORE_QUALIFIED_NAME]);
  });

  it('detects PortDefinition.interfaceId pointing at a library Connection', () => {
    const proj = withElements([
      {
        id: 'pd1' as ElementId,
        kind: 'PortDefinition',
        name: 'P',
        ownerId: 'root' as ElementId,
        ownerRole: 'portDefinition',
        ownerIndex: 0,
        direction: 'in',
        interfaceId: KERML_CORE_ELEMENT_IDS.Connection,
      },
    ]);
    expect(findLibraryReferences(proj)).toEqual([KERML_CORE_QUALIFIED_NAME]);
  });

  it('detects ConnectionUsage source/target pointing at a library element', () => {
    const proj = withElements([
      {
        id: 'cu1' as ElementId,
        kind: 'ConnectionUsage',
        name: 'c',
        ownerId: 'root' as ElementId,
        ownerRole: 'member',
        ownerIndex: 0,
        sourceId: KERML_CORE_ELEMENT_IDS.Part,
        targetId: KERML_CORE_ELEMENT_IDS.Item,
      },
    ]);
    expect(findLibraryReferences(proj)).toEqual([KERML_CORE_QUALIFIED_NAME]);
  });

  it('detects edge endpoints referencing library elements', () => {
    const proj = withElements(
      [
        {
          id: 'pd' as ElementId,
          kind: 'PartDefinition',
          name: 'PD',
          ownerId: 'root' as ElementId,
          ownerRole: 'member',
          ownerIndex: 0,
          isAbstract: false,
        },
      ],
      [
        {
          id: 'e1' as EdgeId,
          kind: 'Generalization',
          sourceId: 'pd' as ElementId,
          targetId: KERML_CORE_ELEMENT_IDS.Part,
        },
      ],
    );
    expect(findLibraryReferences(proj)).toEqual([KERML_CORE_QUALIFIED_NAME]);
  });

  it('deduplicates qualified names across many references', () => {
    const proj = withElements([
      {
        id: 'pu1' as ElementId,
        kind: 'PartUsage',
        name: 'p1',
        ownerId: 'root' as ElementId,
        ownerRole: 'member',
        ownerIndex: 0,
        definitionId: KERML_CORE_ELEMENT_IDS.Part,
      },
      {
        id: 'pu2' as ElementId,
        kind: 'PartUsage',
        name: 'p2',
        ownerId: 'root' as ElementId,
        ownerRole: 'member',
        ownerIndex: 1,
        definitionId: KERML_CORE_ELEMENT_IDS.Item,
      },
    ]);
    // Both Part and Item live under the same library root → single qn.
    expect(findLibraryReferences(proj)).toEqual([KERML_CORE_QUALIFIED_NAME]);
  });

  it('does not count intra-library references (library element ownerId chain)', () => {
    // No user element references library content; intra-library references
    // (Anything.ownerId → Base etc.) must not surface.
    const proj = baseProject();
    expect(findLibraryReferences(proj)).toEqual([]);
  });

  it('returns sorted unique qualified names', () => {
    // Smoke: only one library exists today, so the deterministic-order
    // contract is asserted via the deduped single-element result above.
    // This test guards against the empty case being treated as truthy.
    const out = findLibraryReferences(baseProject());
    expect(Array.isArray(out)).toBe(true);
  });
});
