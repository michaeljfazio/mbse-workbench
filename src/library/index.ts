import type { ElementId, ModelElement } from '@/model';
import type { Project } from '@/repository/types';

import {
  KERML_CORE_LIBRARY_ROOT_ID,
  kermlCoreElements,
} from './kerml/core';

export { KERML_CORE_LIBRARY_ROOT_ID, KERML_CORE_ELEMENT_IDS } from './kerml/core';

/**
 * True iff `element` lives inside a library subtree — i.e. walking `ownerId`
 * upward terminates at an element whose id is in `libraryRootIds`. Library
 * elements are conceptually a separate read-only namespace; consumers that
 * count or list user-authored elements (palette grouping, auto-naming,
 * containment invariants) must filter them out.
 */
export function isLibraryElement(
  element: ModelElement,
  libraryRootIds: readonly ElementId[] | undefined,
  elements: readonly ModelElement[],
): boolean {
  if (!libraryRootIds || libraryRootIds.length === 0) return false;
  const libRootSet = new Set(libraryRootIds);
  const byId = new Map(elements.map((e) => [e.id, e]));
  let cursor: ModelElement | undefined = element;
  const seen = new Set<ElementId>();
  while (cursor) {
    if (libRootSet.has(cursor.id)) return true;
    if (cursor.ownerId === null) return false;
    if (seen.has(cursor.id)) return false; // defensive — cycles shouldn't exist
    seen.add(cursor.id);
    cursor = byId.get(cursor.ownerId);
  }
  return false;
}

/**
 * Inverse of `applyStandardLibrary`, scoped to the *standard* (canonical,
 * vendored) libraries — currently just KerML core. User-defined library
 * roots in `libraryRootIds` and their subtrees are preserved.
 *
 * Used at the persistence boundary (repository.save, JSON export) so
 * sessionStorage and exported files stay "user content only" with respect
 * to canonical libraries; canonical library content is re-merged by
 * `applyStandardLibrary` on load. Idempotent — returns the input
 * reference-equal when there is nothing to strip.
 */
const STANDARD_LIBRARY_ROOT_IDS: ReadonlySet<ElementId> = new Set([
  KERML_CORE_LIBRARY_ROOT_ID,
]);

export function stripStandardLibrary(project: Project): Project {
  const libraryRootIds = project.libraryRootIds;
  if (!libraryRootIds || libraryRootIds.length === 0) return project;
  const standardRoots = libraryRootIds.filter((id) =>
    STANDARD_LIBRARY_ROOT_IDS.has(id),
  );
  if (standardRoots.length === 0) return project;
  const stripRootSet = new Set(standardRoots);
  const byId = new Map(project.elements.map((e) => [e.id, e]));
  const remaining = project.elements.filter((e) => {
    let cursor: ModelElement | undefined = e;
    const seen = new Set<ElementId>();
    while (cursor) {
      if (stripRootSet.has(cursor.id)) return false;
      if (cursor.ownerId === null) return true;
      if (seen.has(cursor.id)) return true;
      seen.add(cursor.id);
      cursor = byId.get(cursor.ownerId);
    }
    return true;
  });
  const nextLibraryRootIds = libraryRootIds.filter(
    (id) => !STANDARD_LIBRARY_ROOT_IDS.has(id),
  );
  const next: Project = { ...project, elements: remaining };
  if (nextLibraryRootIds.length === 0) {
    const { libraryRootIds: _omit, ...rest } = next;
    return rest;
  }
  return { ...next, libraryRootIds: nextLibraryRootIds };
}

/**
 * Returns a project with the KerML standard library merged in. Idempotent —
 * if the library root is already in `libraryRootIds` and every library
 * element is already present in `elements`, the input project is returned
 * unchanged (reference-equal). Otherwise, a new project is returned with:
 *
 *   - any missing library elements appended to `elements`
 *   - the library root id prepended to `libraryRootIds` if absent
 *
 * Existing user-set library roots are preserved.
 */
export function applyStandardLibrary(project: Project): Project {
  const seedElements = kermlCoreElements();
  const elementIds = new Set(project.elements.map((e) => e.id));
  const missing: ModelElement[] = seedElements.filter(
    (e) => !elementIds.has(e.id),
  );

  const existingLibraryRoots = project.libraryRootIds ?? [];
  const rootAlreadyListed = existingLibraryRoots.includes(
    KERML_CORE_LIBRARY_ROOT_ID,
  );

  if (missing.length === 0 && rootAlreadyListed) return project;

  const nextElements: readonly ModelElement[] =
    missing.length === 0
      ? project.elements
      : [...project.elements, ...missing];

  const nextLibraryRootIds: readonly ElementId[] = rootAlreadyListed
    ? existingLibraryRoots
    : [KERML_CORE_LIBRARY_ROOT_ID, ...existingLibraryRoots];

  return {
    ...project,
    elements: nextElements,
    libraryRootIds: nextLibraryRootIds,
  };
}
