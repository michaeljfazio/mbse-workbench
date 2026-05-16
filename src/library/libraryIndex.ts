import type { ElementId, ModelElement } from '@/model';
import type { Project } from '@/repository/types';

import {
  KERML_CORE_LIBRARY_ROOT_ID,
  kermlCoreElements,
} from './kerml/core';

/**
 * Runtime view over the library content available to a project. Replaces
 * the static `STANDARD_LIBRARY_ID_TO_NAME` / `STANDARD_LIBRARY_NAMES_BY_QUALNAME`
 * tables retired in T-14.06: the parser, serializer, and `findLibraryReferences`
 * route every lookup through this interface, so user-defined library roots
 * (any `Package` in `project.libraryRootIds`) are first-class on equal
 * footing with the vendored KerML core.
 */
export interface LibraryIndex {
  /** True iff `id` resolves to an element under any library root subtree
   *  known to this index (standard or user-defined). */
  isLibraryElement(id: ElementId): boolean;

  /** Short `name` of the library element, regardless of whether the element
   *  is currently present in the consuming project's `elements` array.
   *  Used by the serializer's `refName` fallback when the standard library
   *  has been stripped at the persistence boundary. */
  shortNameOf(id: ElementId): string | undefined;

  /** Qualified name of the importable Package under which `id` is a named
   *  member — i.e. the qualified name that an `import …::*;` directive
   *  must declare for the parser to seed `id`'s short name into scope.
   *
   *  - For a library root Package, returns its own name (root Packages
   *    self-register under their own qualified name so an `import Base::*;`
   *    directive can bring `Base` itself back into scope).
   *  - For any other library element directly contained in a library
   *    Package P, returns the qualified name of P.
   *  - For elements nested inside a non-Package library element (e.g. a
   *    port owned by a library PartDefinition), returns the qualified
   *    name of the nearest enclosing library Package; note that such
   *    nested elements are **not** in any `resolveImport` bucket because
   *    `import qn::*;` only exposes a Package's direct members.
   *  - Returns `undefined` for non-library elements. */
  enclosingPackageQualifiedName(id: ElementId): string | undefined;

  /** For a Package qualified name (e.g. `Base` or `MyLib::Sub`), returns the
   *  short-name → element-id map of its directly-named members visible via
   *  `import qn::*;`. Returns `undefined` if no library Package has that
   *  qualified name. The map includes the library root itself when `qn`
   *  matches a root (root self-registration). */
  resolveImport(qualifiedName: string): ReadonlyMap<string, ElementId> | undefined;
}

export const EMPTY_LIBRARY_INDEX: LibraryIndex = {
  isLibraryElement: () => false,
  shortNameOf: () => undefined,
  enclosingPackageQualifiedName: () => undefined,
  resolveImport: () => undefined,
};

/**
 * Build a {@link LibraryIndex} from a list of library roots and the element
 * pool that contains them.
 *
 * Walks each library subtree breadth-first via an `ownerId` reverse index,
 * computing the qualified name path of every library Package along the way.
 * Only direct members of a library Package register in the importable
 * `resolveImport` map; library elements nested inside non-Package elements
 * are still tracked (`isLibraryElement`, `shortNameOf`) but are not
 * exposed by any wildcard import.
 *
 * Roots whose id is not present in `elements` (or whose element is not a
 * Package) are skipped silently.
 */
export function buildLibraryIndex(input: {
  readonly libraryRootIds: readonly ElementId[];
  readonly elements: readonly ModelElement[];
}): LibraryIndex {
  const { libraryRootIds, elements } = input;
  if (libraryRootIds.length === 0) return EMPTY_LIBRARY_INDEX;

  const byId = new Map<ElementId, ModelElement>();
  for (const e of elements) byId.set(e.id, e);

  // Reverse owner index: ownerId → direct children, sorted by ownerIndex.
  const childrenOf = new Map<ElementId, ModelElement[]>();
  for (const e of elements) {
    if (e.ownerId === null) continue;
    const bucket = childrenOf.get(e.ownerId);
    if (bucket) bucket.push(e);
    else childrenOf.set(e.ownerId, [e]);
  }
  for (const bucket of childrenOf.values()) {
    bucket.sort((a, b) => a.ownerIndex - b.ownerIndex);
  }

  const isLib = new Set<ElementId>();
  const shortNames = new Map<ElementId, string>();
  const enclosingQn = new Map<ElementId, string>();
  const importBuckets = new Map<string, Map<string, ElementId>>();

  const addImportableMember = (
    qn: string,
    name: string,
    id: ElementId,
  ): void => {
    let bucket = importBuckets.get(qn);
    if (!bucket) {
      bucket = new Map<string, ElementId>();
      importBuckets.set(qn, bucket);
    }
    if (!bucket.has(name)) bucket.set(name, id);
  };

  interface Frame {
    readonly el: ModelElement;
    readonly enclosingPkgQn: string;
    readonly isDirectPackageMember: boolean;
  }

  for (const rootId of libraryRootIds) {
    const rootEl = byId.get(rootId);
    if (!rootEl || rootEl.kind !== 'Package') continue;

    // Root self-registers under its own name (mirrors T-14.05 behaviour:
    // `import Base::*;` brings `Base` itself into scope alongside its
    // members).
    const queue: Frame[] = [
      { el: rootEl, enclosingPkgQn: rootEl.name, isDirectPackageMember: true },
    ];

    while (queue.length > 0) {
      const frame = queue.shift()!;
      const { el, enclosingPkgQn, isDirectPackageMember } = frame;

      isLib.add(el.id);
      shortNames.set(el.id, el.name);
      enclosingQn.set(el.id, enclosingPkgQn);
      if (isDirectPackageMember) {
        addImportableMember(enclosingPkgQn, el.name, el.id);
      }

      const children = childrenOf.get(el.id);
      if (!children) continue;

      if (el.kind === 'Package') {
        // Children are members of qn(el).
        const childPkgQn =
          el.id === rootEl.id
            ? rootEl.name
            : `${enclosingPkgQn}::${el.name}`;
        for (const child of children) {
          queue.push({
            el: child,
            enclosingPkgQn: childPkgQn,
            isDirectPackageMember: true,
          });
        }
      } else {
        // Non-Package element: children remain library content but are
        // not direct Package members and so are not in any import bucket.
        for (const child of children) {
          queue.push({
            el: child,
            enclosingPkgQn,
            isDirectPackageMember: false,
          });
        }
      }
    }
  }

  return {
    isLibraryElement: (id) => isLib.has(id),
    shortNameOf: (id) => shortNames.get(id),
    enclosingPackageQualifiedName: (id) => enclosingQn.get(id),
    resolveImport: (qn) => importBuckets.get(qn),
  };
}

/**
 * The canonical standard-library index — built once from the vendored
 * KerML core fixture. Used as the parser's default when no project-derived
 * index is supplied (e.g. parsing fresh text outside the workspace), and
 * folded into project-derived indexes by {@link buildLibraryIndexForProject}
 * so the standard library is visible even when it has been stripped from
 * `project.elements` at the persistence boundary.
 */
export const STANDARD_LIBRARY_INDEX: LibraryIndex = buildLibraryIndex({
  libraryRootIds: [KERML_CORE_LIBRARY_ROOT_ID],
  elements: kermlCoreElements(),
});

/**
 * Build a {@link LibraryIndex} for a {@link Project}. Always includes the
 * canonical standard library (re-merged from the vendored fixture, in case
 * the project was passed through `stripStandardLibrary` before serializing),
 * plus any user-defined library roots and their subtrees from
 * `project.elements`.
 */
export function buildLibraryIndexForProject(project: Project): LibraryIndex {
  const projectRoots = project.libraryRootIds ?? [];
  const hasStandard = projectRoots.includes(KERML_CORE_LIBRARY_ROOT_ID);
  const allRoots = hasStandard
    ? projectRoots
    : [KERML_CORE_LIBRARY_ROOT_ID, ...projectRoots];

  // Merge in canonical library elements if missing — guarantees the index
  // can resolve standard-library references regardless of whether
  // `project.elements` currently contains the library subtree.
  const elementIds = new Set(project.elements.map((e) => e.id));
  const standardElements = kermlCoreElements();
  const missing = standardElements.filter((e) => !elementIds.has(e.id));
  const allElements: readonly ModelElement[] =
    missing.length === 0 ? project.elements : [...project.elements, ...missing];

  return buildLibraryIndex({ libraryRootIds: allRoots, elements: allElements });
}
