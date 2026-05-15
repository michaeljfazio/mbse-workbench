import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  type EdgeId,
  type ElementId,
  type ModelElement,
  type PartUsageElement,
  createElementId,
} from '@/model';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

async function bootstrap(): Promise<void> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

function rootId(): ElementId {
  const id = useWorkspaceStore.getState().project?.rootId;
  if (!id) throw new Error('no root');
  return id;
}

function elementById(id: ElementId): ModelElement | undefined {
  return useWorkspaceStore.getState().elements.find((e) => e.id === id);
}

function childrenOf(id: ElementId): readonly ModelElement[] {
  return useWorkspaceStore
    .getState()
    .elements.filter((e) => e.ownerId === id)
    .slice()
    .sort((a, b) => a.ownerIndex - b.ownerIndex);
}

describe('workspace store — duplicateElement', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('clones a leaf element with " copy" suffix at the next sibling slot', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'P')!;

    const cloneId = store().duplicateElement(pkg);
    expect(cloneId).not.toBeNull();
    const clone = elementById(cloneId!)!;
    expect(clone.kind).toBe('Package');
    expect(clone.name).toBe('P copy');
    expect(clone.ownerId).toBe(rootId());
    expect(clone.ownerRole).toBe('member');
    // Original at index 0, clone appended at index 1.
    expect(elementById(pkg)?.ownerIndex).toBe(0);
    expect(clone.ownerIndex).toBe(1);
    // Distinct id.
    expect(clone.id).not.toBe(pkg);
  });

  it('clones descendants of multiple kinds with remapped ownerId chain', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    const port = store().createChildElement(part, 'PortDefinition', 'port', 'in')!;
    const value = store().createChildElement(
      part,
      'ValueProperty',
      'property',
      'power',
    )!;

    const cloneId = store().duplicateElement(part)!;
    const clone = elementById(cloneId)!;
    expect(clone.name).toBe('Engine copy');

    const cloneChildren = childrenOf(cloneId);
    expect(cloneChildren).toHaveLength(2);
    const clonedPort = cloneChildren.find((c) => c.kind === 'PortDefinition')!;
    const clonedValue = cloneChildren.find((c) => c.kind === 'ValueProperty')!;
    expect(clonedPort.id).not.toBe(port);
    expect(clonedValue.id).not.toBe(value);
    expect(clonedPort.ownerRole).toBe('port');
    expect(clonedValue.ownerRole).toBe('property');
    // Original descendants untouched.
    expect(elementById(port)?.ownerId).toBe(part);
    expect(elementById(value)?.ownerId).toBe(part);
  });

  it('clones intra-subtree edges with remapped endpoints', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'Sys')!;
    const a = store().createChildElement(pkg, 'PartDefinition', 'member', 'A')!;
    const b = store().createChildElement(pkg, 'PartDefinition', 'member', 'B')!;
    const compositionEdgeId = store().linkBlocks(a, b, 'Composition')!;
    expect(compositionEdgeId).not.toBeNull();

    const cloneId = store().duplicateElement(pkg)!;
    const clonedChildren = childrenOf(cloneId);
    expect(clonedChildren).toHaveLength(2);
    const clonedA = clonedChildren.find((c) => c.name === 'A')!;
    const clonedB = clonedChildren.find((c) => c.name === 'B')!;

    const edges = store().edges;
    // Original edge still in place; cloned edge has remapped endpoints and a
    // fresh edge id.
    const originalEdge = edges.find((e) => e.id === compositionEdgeId)!;
    expect(originalEdge.sourceId).toBe(a);
    expect(originalEdge.targetId).toBe(b);
    const clonedEdge = edges.find(
      (e) =>
        e.kind === 'Composition' &&
        e.sourceId === clonedA.id &&
        e.targetId === clonedB.id,
    );
    expect(clonedEdge).toBeDefined();
    expect(clonedEdge!.id).not.toBe(compositionEdgeId);
  });

  it('drops edges that cross the subtree boundary', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const inside = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Inside',
    )!;
    const outside = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Outside',
    )!;
    const crossEdge = store().linkBlocks(inside, outside, 'Composition')!;

    store().duplicateElement(inside);

    // Cross-subtree edge survives once (the original) and is NOT cloned.
    const crossCloneCount = store()
      .edges.filter(
        (e) => e.kind === 'Composition' && e.sourceId === inside,
      )
      .length;
    expect(crossCloneCount).toBe(1);
    expect(
      store().edges.some((e) => e.id === crossEdge && e.sourceId === inside),
    ).toBe(true);
  });

  it('remaps field-based definitionId refs that point inside the subtree', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'Sys')!;
    const def = store().createChildElement(
      pkg,
      'PartDefinition',
      'member',
      'Engine',
    )!;

    // Synthesise a PartUsage child of the Package with definitionId → def.
    // createChildElement intentionally rejects PartUsage (it requires a
    // diagram position), so we go through the command bus directly.
    const usageId = createElementId();
    const usage: PartUsageElement = {
      id: usageId,
      kind: 'PartUsage',
      ownerId: pkg,
      ownerRole: 'member',
      ownerIndex: 1,
      name: 'engine',
      definitionId: def,
    };
    const state = useWorkspaceStore.getState();
    state.bus!.dispatch({ kind: 'create-element', element: usage }, state.user!);

    const cloneId = store().duplicateElement(pkg)!;
    const clonedChildren = childrenOf(cloneId);
    const clonedDef = clonedChildren.find((c) => c.kind === 'PartDefinition')!;
    const clonedUsage = clonedChildren.find(
      (c): c is PartUsageElement => c.kind === 'PartUsage',
    )!;
    expect(clonedUsage.definitionId).toBe(clonedDef.id);
    expect(clonedUsage.definitionId).not.toBe(def);
  });

  it('preserves field-based definitionId refs that point outside the subtree', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const def = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'Sys')!;
    const usageId = createElementId();
    const usage: PartUsageElement = {
      id: usageId,
      kind: 'PartUsage',
      ownerId: pkg,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'engine',
      definitionId: def,
    };
    const state = useWorkspaceStore.getState();
    state.bus!.dispatch({ kind: 'create-element', element: usage }, state.user!);

    const cloneId = store().duplicateElement(pkg)!;
    const clonedUsage = childrenOf(cloneId).find(
      (c): c is PartUsageElement => c.kind === 'PartUsage',
    )!;
    // Definition lives outside the cloned subtree, so the ref is preserved.
    expect(clonedUsage.definitionId).toBe(def);
  });

  it('returns null for the project root', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    expect(store().duplicateElement(rootId())).toBeNull();
  });

  it('returns null for an unknown id', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    expect(
      store().duplicateElement('ghost' as unknown as ElementId),
    ).toBeNull();
  });

  it('is a single undo step — undo reverts the entire clone', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    store().createChildElement(part, 'PortDefinition', 'port', 'in')!;
    store().createChildElement(part, 'ValueProperty', 'property', 'power')!;

    const beforeIds = new Set(store().elements.map((e) => e.id));
    const cloneId = store().duplicateElement(part)!;
    expect(store().elements.length).toBe(beforeIds.size + 3);

    store().undo();
    expect(store().elements.length).toBe(beforeIds.size);
    expect(elementById(cloneId)).toBeUndefined();

    store().redo();
    expect(store().elements.length).toBe(beforeIds.size + 3);
    expect(elementById(cloneId)).toBeDefined();
  });

  it('does not duplicate or remap edges that are themselves outside the subtree', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const a = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'A',
    )!;
    const b = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'B',
    )!;
    const target = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Target',
    )!;
    const unrelatedEdge: EdgeId = store().linkBlocks(a, b, 'Generalization')!;

    store().duplicateElement(target);

    // The unrelated edge is unchanged and not cloned.
    expect(
      store().edges.filter((e) => e.id === unrelatedEdge),
    ).toHaveLength(1);
    expect(
      store().edges.filter((e) => e.kind === 'Generalization'),
    ).toHaveLength(1);
  });

  // Synthesised connection-usage edge crossing the subtree boundary should
  // be dropped from the clone entirely. We exercise the same code path with
  // a synthesised ItemFlow because Transitions live in state machines (more
  // viewpoint setup) and ConnectionUsages need PortUsage endpoints (more
  // setup still). ItemFlow has the same drop semantics.
  it('drops element-edges (ItemFlow) whose embedded endpoints leave the subtree', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'Sys')!;
    const inside = store().createChildElement(
      pkg,
      'PartDefinition',
      'member',
      'Inside',
    )!;
    const outside = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Outside',
    )!;

    // Synthesise an ItemFlow inside the Package, pointing from a subtree
    // element (`inside`) to an outside element. The flow's owner is in the
    // subtree but its embedded targetId is not — so the clone must drop it.
    const flowId = createElementId();
    const state = useWorkspaceStore.getState();
    state.bus!.dispatch(
      {
        kind: 'create-element',
        element: {
          id: flowId,
          kind: 'ItemFlow',
          ownerId: pkg,
          ownerRole: 'member',
          ownerIndex: 1,
          name: 'leak',
          sourceId: inside,
          targetId: outside,
        },
      },
      state.user!,
    );

    const cloneId = store().duplicateElement(pkg)!;
    const cloneSubtreeIds = new Set<ElementId>([
      cloneId,
      ...childrenOf(cloneId).map((c) => c.id),
    ]);
    // No element of kind ItemFlow exists in the cloned subtree.
    const itemFlowsInClone = store().elements.filter(
      (e) =>
        e.kind === 'ItemFlow' &&
        e.ownerId !== null &&
        cloneSubtreeIds.has(e.ownerId),
    );
    expect(itemFlowsInClone).toHaveLength(0);
    // The original ItemFlow is untouched.
    expect(elementById(flowId)).toBeDefined();
  });

});
