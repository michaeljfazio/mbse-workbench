import { describe, expect, it } from 'vitest';

import type { ElementId, ModelElement, ProjectId } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  applyStandardLibrary,
  KERML_CORE_ELEMENT_IDS,
  stripStandardLibrary,
} from '@/library';
import { serializeProject } from '@/serializer/sysml';
import { parseSysmlText } from '@/parser/sysml';

/**
 * End-to-end T-14.05 round-trip: a project that references KerML library
 * content survives strip → serialize → parse → re-apply with the
 * library-cross reference intact.
 */
describe('SysMLv2 text round-trip with library references (T-14.05)', () => {
  it('preserves a PartUsage definitionId pointing at a library PartDefinition', () => {
    const rootId = 'root' as ElementId;
    const pu: ModelElement = {
      id: 'pu' as ElementId,
      kind: 'PartUsage',
      name: 'engine',
      ownerId: rootId,
      ownerRole: 'member',
      ownerIndex: 0,
      definitionId: KERML_CORE_ELEMENT_IDS.Part,
    };
    const seed: Project = applyStandardLibrary({
      id: 'P1' as ProjectId,
      name: 'demo',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId,
      elements: [
        {
          id: rootId,
          kind: 'Package',
          name: 'demo',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
        pu,
      ],
      edges: [],
      diagrams: [],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    });

    // Mirror downloadProjectSysml: strip library before serialize.
    const text = serializeProject(stripStandardLibrary(seed));
    expect(text).toContain('import Base::*;');

    // Mirror importSysmlText: parse → applyStandardLibrary.
    const parsed = parseSysmlText(text);
    if (!parsed.ok) {
      throw new Error(
        'parse failed: ' +
          JSON.stringify(parsed.errors) +
          '\nTEXT:\n' +
          text,
      );
    }

    expect(parsed.value.imports).toEqual(['Base']);

    const rehydrated: Project = applyStandardLibrary({
      id: parsed.value.projectId ?? ('P1' as ProjectId),
      name: parsed.value.projectName ?? 'demo',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId,
      elements: parsed.value.elements,
      edges: parsed.value.edges,
      diagrams: [],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    });

    // The user PartUsage survived with its library reference intact.
    const reUsage = rehydrated.elements.find((e) => e.id === 'pu');
    expect(reUsage?.kind).toBe('PartUsage');
    if (reUsage?.kind === 'PartUsage') {
      expect(reUsage.definitionId).toBe(KERML_CORE_ELEMENT_IDS.Part);
    }
    // The library element is present (merged back in).
    expect(
      rehydrated.elements.some((e) => e.id === KERML_CORE_ELEMENT_IDS.Part),
    ).toBe(true);
    // The library root is registered.
    expect(rehydrated.libraryRootIds).toContain(KERML_CORE_ELEMENT_IDS.Base);
  });

  it('omits import lines when the project references no library content', () => {
    const rootId = 'root' as ElementId;
    const seed: Project = applyStandardLibrary({
      id: 'P1' as ProjectId,
      name: 'demo',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId,
      elements: [
        {
          id: rootId,
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
    });

    const text = serializeProject(stripStandardLibrary(seed));
    expect(text).not.toContain('import ');
  });
});
