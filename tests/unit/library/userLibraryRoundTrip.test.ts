import { describe, expect, it } from 'vitest';

import type { ElementId, ModelElement, ProjectId } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  applyStandardLibrary,
  buildLibraryIndexForProject,
  findLibraryReferences,
  KERML_CORE_ELEMENT_IDS,
  stripStandardLibrary,
} from '@/library';
import { parseSysmlText } from '@/parser/sysml';
import { serializeProject } from '@/serializer/sysml';

/**
 * T-14.06 round-trip: a project that references *both* the standard
 * library AND a user-defined library root survives serialise → parse with
 * the cross-library references intact, when the parser is given a
 * library index that covers both libraries (as `importSysmlText` does).
 */
describe('SysMLv2 user-defined library round-trip (T-14.06)', () => {
  const myLibRootId = 'lib.myLib' as ElementId;
  const widgetId = 'lib.myLib.Widget' as ElementId;
  const rootId = 'root' as ElementId;
  const partUsage1Id = 'pu-widget' as ElementId;
  const partUsage2Id = 'pu-kerml' as ElementId;

  /** Synthetic library + project: `MyLib::Widget` is a user-defined
   *  PartDefinition; the project has two PartUsages — one referencing
   *  `Widget` (user library) and one referencing `Part` (KerML core). */
  function buildSeed(): Project {
    const elements: ModelElement[] = [
      {
        id: rootId,
        kind: 'Package',
        name: 'demo',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
      },
      // user library
      {
        id: myLibRootId,
        kind: 'Package',
        name: 'MyLib',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 1,
        isReadOnly: true,
      },
      {
        id: widgetId,
        kind: 'PartDefinition',
        name: 'Widget',
        ownerId: myLibRootId,
        ownerRole: 'member',
        ownerIndex: 0,
        isAbstract: false,
      },
      // user content
      {
        id: partUsage1Id,
        kind: 'PartUsage',
        name: 'gadget',
        ownerId: rootId,
        ownerRole: 'member',
        ownerIndex: 0,
        definitionId: widgetId,
      },
      {
        id: partUsage2Id,
        kind: 'PartUsage',
        name: 'engine',
        ownerId: rootId,
        ownerRole: 'member',
        ownerIndex: 1,
        definitionId: KERML_CORE_ELEMENT_IDS.Part,
      },
    ];
    return applyStandardLibrary({
      id: 'P1' as ProjectId,
      name: 'demo',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId,
      elements,
      edges: [],
      libraryRootIds: [myLibRootId],
      diagrams: [],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    });
  }

  it('findLibraryReferences returns both standard and user-library qns', () => {
    const seed = buildSeed();
    const qns = findLibraryReferences(seed);
    // Sorted: 'Base' < 'MyLib'.
    expect(qns).toEqual(['Base', 'MyLib']);
  });

  it('serializer emits one import directive per referenced library', () => {
    const seed = buildSeed();
    // Mirror downloadProjectSysml: strip standard library before serialise.
    // The user library is preserved (stripStandardLibrary only strips KerML).
    const text = serializeProject(stripStandardLibrary(seed));
    expect(text).toContain('import Base::*;');
    expect(text).toContain('import MyLib::*;');
    // User library root itself is filtered out of the top-level rendering —
    // it is *referenced* by the import, not emitted as a `package MyLib { … }`
    // block. (User libraries are conceptually vendored separately and
    // re-vendored on import; serialised user files declare the dependency
    // by import, not embedded copy.)
    expect(text).not.toContain('package MyLib {');
  });

  it('parser re-resolves both library references when given a matching index', () => {
    const seed = buildSeed();
    const text = serializeProject(stripStandardLibrary(seed));

    // Build the library index from the seed project — this is what the
    // workspace `importSysmlText` action does (it uses the current
    // project's library namespace).
    const libraryIndex = buildLibraryIndexForProject(seed);

    const parsed = parseSysmlText(text, { libraryIndex });
    if (!parsed.ok) {
      throw new Error(
        'parse failed: ' +
          JSON.stringify(parsed.errors) +
          '\nTEXT:\n' +
          text,
      );
    }

    expect(parsed.value.imports).toEqual(['Base', 'MyLib']);

    // Both PartUsages re-resolved their definitionId via the index.
    const gadget = parsed.value.elements.find((e) => e.id === partUsage1Id);
    const engine = parsed.value.elements.find((e) => e.id === partUsage2Id);
    expect(gadget?.kind).toBe('PartUsage');
    if (gadget?.kind === 'PartUsage') {
      expect(gadget.definitionId).toBe(widgetId);
    }
    expect(engine?.kind).toBe('PartUsage');
    if (engine?.kind === 'PartUsage') {
      expect(engine.definitionId).toBe(KERML_CORE_ELEMENT_IDS.Part);
    }
  });

  it('without a matching library index, user-library refs do not resolve', () => {
    const seed = buildSeed();
    const text = serializeProject(stripStandardLibrary(seed));

    // Default index = standard library only. The `import MyLib::*;` line
    // is parsed but seeds nothing, so `Widget` references won't resolve.
    const parsed = parseSysmlText(text);
    if (!parsed.ok) {
      throw new Error('parse failed: ' + JSON.stringify(parsed.errors));
    }

    expect(parsed.value.imports).toEqual(['Base', 'MyLib']);

    // KerML reference still resolves (default index covers Base).
    const engine = parsed.value.elements.find((e) => e.id === partUsage2Id);
    expect(engine?.kind).toBe('PartUsage');
    if (engine?.kind === 'PartUsage') {
      expect(engine.definitionId).toBe(KERML_CORE_ELEMENT_IDS.Part);
    }

    // User-library `Widget` reference is NOT resolved — the parser falls
    // back to using the raw short name as the id (current resolveName
    // contract). This is the divergence between full namespace resolution
    // (vendored library available) and decorative parse (no library
    // context).
    const gadget = parsed.value.elements.find((e) => e.id === partUsage1Id);
    expect(gadget?.kind).toBe('PartUsage');
    if (gadget?.kind === 'PartUsage') {
      expect(gadget.definitionId).not.toBe(widgetId);
      expect(gadget.definitionId).toBe('Widget' as ElementId);
    }
  });
});
