import { describe, expect, it } from 'vitest';

import type { ElementId, ModelElement, ProjectId } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  applyStandardLibrary,
  buildLibraryIndex,
  buildLibraryIndexForProject,
  EMPTY_LIBRARY_INDEX,
  KERML_CORE_ELEMENT_IDS,
  KERML_CORE_LIBRARY_ROOT_ID,
  KERML_CORE_QUALIFIED_NAME,
  STANDARD_LIBRARY_INDEX,
  stripStandardLibrary,
} from '@/library';

/** Build a synthetic project with a single user-defined library root
 *  `MyLib` containing a `Widget` PartDefinition and a nested package
 *  `Inner` with a `Thing` PartDefinition. Returns the project plus the
 *  ids of every library element so tests can refer to them by symbol. */
function syntheticProjectWithUserLibrary(): {
  project: Project;
  ids: {
    myLib: ElementId;
    widget: ElementId;
    inner: ElementId;
    thing: ElementId;
  };
} {
  const myLib = 'lib.myLib' as ElementId;
  const widget = 'lib.myLib.Widget' as ElementId;
  const inner = 'lib.myLib.Inner' as ElementId;
  const thing = 'lib.myLib.Inner.Thing' as ElementId;
  const root = 'root' as ElementId;

  const elements: ModelElement[] = [
    {
      id: root,
      kind: 'Package',
      name: 'demo',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
    },
    {
      id: myLib,
      kind: 'Package',
      name: 'MyLib',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      isReadOnly: true,
    },
    {
      id: widget,
      kind: 'PartDefinition',
      name: 'Widget',
      ownerId: myLib,
      ownerRole: 'member',
      ownerIndex: 0,
      isAbstract: false,
    },
    {
      id: inner,
      kind: 'Package',
      name: 'Inner',
      ownerId: myLib,
      ownerRole: 'member',
      ownerIndex: 1,
      isReadOnly: true,
    },
    {
      id: thing,
      kind: 'PartDefinition',
      name: 'Thing',
      ownerId: inner,
      ownerRole: 'member',
      ownerIndex: 0,
      isAbstract: false,
    },
  ];

  const project: Project = applyStandardLibrary({
    id: 'p' as ProjectId,
    name: 'demo',
    createdAt: '2026-05-16T00:00:00.000Z',
    modifiedAt: '2026-05-16T00:00:00.000Z',
    rootId: root,
    elements,
    edges: [],
    libraryRootIds: [myLib],
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  });

  return { project, ids: { myLib, widget, inner, thing } };
}

describe('buildLibraryIndex (T-14.06)', () => {
  it('returns EMPTY_LIBRARY_INDEX when no library roots are supplied', () => {
    const idx = buildLibraryIndex({ libraryRootIds: [], elements: [] });
    expect(idx).toBe(EMPTY_LIBRARY_INDEX);
    expect(idx.isLibraryElement('x' as ElementId)).toBe(false);
    expect(idx.resolveImport('Foo')).toBeUndefined();
  });

  it('STANDARD_LIBRARY_INDEX covers every KerML core element', () => {
    expect(STANDARD_LIBRARY_INDEX.isLibraryElement(KERML_CORE_ELEMENT_IDS.Base)).toBe(true);
    expect(STANDARD_LIBRARY_INDEX.isLibraryElement(KERML_CORE_ELEMENT_IDS.Part)).toBe(true);
    expect(STANDARD_LIBRARY_INDEX.shortNameOf(KERML_CORE_ELEMENT_IDS.Part)).toBe('Part');
    expect(
      STANDARD_LIBRARY_INDEX.enclosingPackageQualifiedName(KERML_CORE_ELEMENT_IDS.Part),
    ).toBe(KERML_CORE_QUALIFIED_NAME);
    const baseMembers = STANDARD_LIBRARY_INDEX.resolveImport(KERML_CORE_QUALIFIED_NAME);
    expect(baseMembers).toBeDefined();
    expect(baseMembers?.get('Part')).toBe(KERML_CORE_ELEMENT_IDS.Part);
    // Root self-registers under its own qualified name.
    expect(baseMembers?.get('Base')).toBe(KERML_CORE_LIBRARY_ROOT_ID);
  });

  it('returns undefined for non-library element ids', () => {
    expect(STANDARD_LIBRARY_INDEX.isLibraryElement('user-elt' as ElementId)).toBe(false);
    expect(STANDARD_LIBRARY_INDEX.shortNameOf('user-elt' as ElementId)).toBeUndefined();
    expect(
      STANDARD_LIBRARY_INDEX.enclosingPackageQualifiedName('user-elt' as ElementId),
    ).toBeUndefined();
  });

  it('resolveImport returns undefined for an unknown qualified name', () => {
    expect(STANDARD_LIBRARY_INDEX.resolveImport('UnknownLib')).toBeUndefined();
    expect(STANDARD_LIBRARY_INDEX.resolveImport('Base::DoesNotExist')).toBeUndefined();
  });

  it('builds an index covering a user-defined library root in addition to KerML', () => {
    const { project, ids } = syntheticProjectWithUserLibrary();
    const idx = buildLibraryIndexForProject(project);

    // KerML still resolves.
    expect(idx.isLibraryElement(KERML_CORE_ELEMENT_IDS.Part)).toBe(true);
    expect(idx.resolveImport('Base')?.get('Part')).toBe(KERML_CORE_ELEMENT_IDS.Part);

    // User library content resolves.
    expect(idx.isLibraryElement(ids.myLib)).toBe(true);
    expect(idx.isLibraryElement(ids.widget)).toBe(true);
    expect(idx.shortNameOf(ids.widget)).toBe('Widget');
    expect(idx.enclosingPackageQualifiedName(ids.widget)).toBe('MyLib');

    const myLibMembers = idx.resolveImport('MyLib');
    expect(myLibMembers).toBeDefined();
    expect(myLibMembers?.get('Widget')).toBe(ids.widget);
    expect(myLibMembers?.get('MyLib')).toBe(ids.myLib); // root self-registers
    // Nested package `Inner` is a direct member of MyLib.
    expect(myLibMembers?.get('Inner')).toBe(ids.inner);
    // Inner's `Thing` is NOT a direct member of MyLib.
    expect(myLibMembers?.get('Thing')).toBeUndefined();
  });

  it('exposes a nested package via its qualified name', () => {
    const { project, ids } = syntheticProjectWithUserLibrary();
    const idx = buildLibraryIndexForProject(project);

    // `import MyLib::Inner::*;` should bring `Thing` into scope.
    const innerMembers = idx.resolveImport('MyLib::Inner');
    expect(innerMembers).toBeDefined();
    expect(innerMembers?.get('Thing')).toBe(ids.thing);
    expect(idx.enclosingPackageQualifiedName(ids.thing)).toBe('MyLib::Inner');
  });

  it('folds in the standard library even when project has stripped it', () => {
    const { project } = syntheticProjectWithUserLibrary();
    // Strip KerML so project.elements no longer contains it (mirrors what
    // `downloadProjectSysml` does at the persistence boundary).
    const stripped = stripStandardLibrary(project);
    expect(stripped.elements.some((e) => e.id === KERML_CORE_ELEMENT_IDS.Part)).toBe(false);

    // The index must still resolve KerML refs because the serializer needs
    // them for `refName` fallback when emitting `: Part`.
    const idx = buildLibraryIndexForProject(stripped);
    expect(idx.isLibraryElement(KERML_CORE_ELEMENT_IDS.Part)).toBe(true);
    expect(idx.shortNameOf(KERML_CORE_ELEMENT_IDS.Part)).toBe('Part');
    expect(idx.resolveImport('Base')?.get('Part')).toBe(KERML_CORE_ELEMENT_IDS.Part);
  });

  it('isLibraryElement is false for elements outside any library subtree', () => {
    const { project, ids } = syntheticProjectWithUserLibrary();
    const idx = buildLibraryIndexForProject(project);
    expect(idx.isLibraryElement('root' as ElementId)).toBe(false);
    // user element pointing at a library def is still a user element.
    expect(idx.isLibraryElement(ids.widget)).toBe(true);
  });
});
