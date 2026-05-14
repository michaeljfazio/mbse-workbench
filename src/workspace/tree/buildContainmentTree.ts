import type { ElementId, ModelElement } from '@/model';

import type { Diagram } from '../diagram';

export interface ContainmentElementNode {
  readonly kind: 'element';
  readonly element: ModelElement;
  readonly children: readonly ContainmentTreeNode[];
}

export interface ContainmentRepresentationNode {
  readonly kind: 'representation';
  readonly diagram: Diagram;
}

export type ContainmentTreeNode =
  | ContainmentElementNode
  | ContainmentRepresentationNode;

export interface BuildContainmentTreeInput {
  readonly elements: readonly ModelElement[];
  readonly diagrams: readonly Diagram[];
  readonly rootId: ElementId | null | undefined;
}

// Builds the containment tree shown in the Project Explorer (T-13.31).
//
// Rules:
//   - Root is the element identified by `rootId` (the project's root Package).
//   - Element children are taken from `ownerId`, sorted by `ownerIndex` ascending,
//     ties broken by `id` for determinism.
//   - Representations (diagrams) appear nested under the element identified by
//     `diagram.context.id`. A diagram with no context, or with a context whose
//     target is missing, attaches to the root (orphan-tolerance).
//   - Representations sort by `name` then `id`, and render after the element
//     children of the same parent so structural elements stay primary.
//   - Elements whose `ownerId` does not resolve to any element in the input are
//     dropped (they would otherwise dangle); registry integrity already
//     surfaces this as an error elsewhere.
export function buildContainmentTree(
  input: BuildContainmentTreeInput,
): ContainmentElementNode | null {
  const { elements, diagrams, rootId } = input;
  if (!rootId) return null;

  const byId = new Map<ElementId, ModelElement>();
  for (const el of elements) byId.set(el.id, el);

  const root = byId.get(rootId);
  if (!root) return null;

  const childrenByParent = new Map<ElementId, ModelElement[]>();
  for (const el of elements) {
    if (el.id === rootId) continue;
    if (el.ownerId === null || el.ownerId === undefined) continue;
    if (!byId.has(el.ownerId)) continue;
    const bucket = childrenByParent.get(el.ownerId) ?? [];
    bucket.push(el);
    childrenByParent.set(el.ownerId, bucket);
  }
  for (const bucket of childrenByParent.values()) {
    bucket.sort((a, b) => {
      if (a.ownerIndex !== b.ownerIndex) return a.ownerIndex - b.ownerIndex;
      return a.id.localeCompare(b.id);
    });
  }

  const repsByParent = new Map<ElementId, Diagram[]>();
  for (const d of diagrams) {
    const ctxId = d.context?.id;
    const parentId = ctxId && byId.has(ctxId) ? ctxId : rootId;
    const bucket = repsByParent.get(parentId) ?? [];
    bucket.push(d);
    repsByParent.set(parentId, bucket);
  }
  for (const bucket of repsByParent.values()) {
    bucket.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });
  }

  function nodeFor(element: ModelElement): ContainmentElementNode {
    const elementChildren = (childrenByParent.get(element.id) ?? []).map(nodeFor);
    const repChildren: ContainmentRepresentationNode[] = (
      repsByParent.get(element.id) ?? []
    ).map((diagram) => ({ kind: 'representation', diagram }));
    return {
      kind: 'element',
      element,
      children: [...elementChildren, ...repChildren],
    };
  }

  return nodeFor(root);
}
