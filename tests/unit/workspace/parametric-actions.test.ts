import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  PARAMETRIC_VIEWPOINT_ID,
} from '@/viewpoints';
import type {
  ConstraintDefinitionElement,
  ConstraintUsageElement,
  ValuePropertyElement,
} from '@/model';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import type { DiagramId } from '@/workspace';

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

async function bootstrapParametric(): Promise<DiagramId> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  const id = useWorkspaceStore
    .getState()
    .createDiagram(PARAMETRIC_VIEWPOINT_ID);
  if (!id) throw new Error('failed to create parametric diagram');
  useWorkspaceStore.getState().setActiveDiagram(id);
  return id;
}

describe('parametric workspace actions (#136)', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
  });
  afterEach(() => {
    resetWorkspaceStoreForTests();
  });

  it('createConstraintUsage creates a paired ConstraintDefinition and places the usage', async () => {
    const diagramId = await bootstrapParametric();
    const id = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 100, y: 120 });
    expect(id).not.toBeNull();

    const s = useWorkspaceStore.getState();
    const usage = s.elements.find(
      (e): e is ConstraintUsageElement =>
        e.kind === 'ConstraintUsage' && e.id === id!,
    );
    expect(usage).toBeDefined();
    expect(usage!.name).toBe('Constraint1');

    const def = s.elements.find(
      (e): e is ConstraintDefinitionElement =>
        e.kind === 'ConstraintDefinition' && e.id === usage!.definitionId,
    );
    expect(def).toBeDefined();
    expect(def!.expression).toBe('');
    expect(
      s.elements.filter(
        (e) => e.ownerId === def!.id && e.ownerRole === 'parameter',
      ),
    ).toEqual([]);

    const diagram = s.diagrams.find((d) => d.id === diagramId);
    expect(diagram?.positions[id!]).toEqual({ x: 100, y: 120 });
  });

  it('createConstraintUsage names cascade Constraint1, Constraint2, …', async () => {
    const diagramId = await bootstrapParametric();
    const a = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 });
    const b = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 });
    const s = useWorkspaceStore.getState();
    const names = s.elements
      .filter((e): e is ConstraintUsageElement => e.kind === 'ConstraintUsage')
      .map((e) => e.name)
      .sort();
    expect(names).toEqual(['Constraint1', 'Constraint2']);
    expect(a).not.toBe(b);
  });

  it('createValueProperty defaults to number type with no defaultValue', async () => {
    const diagramId = await bootstrapParametric();
    const id = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 200, y: 200 });
    expect(id).not.toBeNull();
    const vp = useWorkspaceStore
      .getState()
      .elements.find(
        (e): e is ValuePropertyElement => e.kind === 'ValueProperty',
      );
    expect(vp).toBeDefined();
    expect(vp!.name).toBe('value1');
    expect(vp!.valueType).toBe('number');
    expect(vp!.defaultValue).toBeUndefined();
  });

  it('setConstraintExpression updates the linked ConstraintDefinition', async () => {
    const diagramId = await bootstrapParametric();
    const usageId = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 });
    useWorkspaceStore
      .getState()
      .setConstraintExpression(usageId!, 'F = m * a');
    const s = useWorkspaceStore.getState();
    const usage = s.elements.find(
      (e): e is ConstraintUsageElement => e.id === usageId,
    )!;
    const def = s.elements.find(
      (e): e is ConstraintDefinitionElement => e.id === usage.definitionId,
    )!;
    expect(def.expression).toBe('F = m * a');
  });

  it('setValuePropertyType + setValuePropertyDefault round-trip values', async () => {
    const diagramId = await bootstrapParametric();
    const id = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 0, y: 0 });
    useWorkspaceStore.getState().setValuePropertyType(id!, 'string');
    useWorkspaceStore.getState().setValuePropertyDefault(id!, 'kg');
    let vp = useWorkspaceStore
      .getState()
      .elements.find((e): e is ValuePropertyElement => e.id === id)!;
    expect(vp.valueType).toBe('string');
    expect(vp.defaultValue).toBe('kg');

    useWorkspaceStore.getState().setValuePropertyDefault(id!, undefined);
    vp = useWorkspaceStore
      .getState()
      .elements.find((e): e is ValuePropertyElement => e.id === id)!;
    expect(vp.defaultValue).toBeUndefined();
  });

  it('undo reverts ConstraintUsage + ConstraintDefinition together (compound command)', async () => {
    const diagramId = await bootstrapParametric();
    const baseline = useWorkspaceStore.getState().elements.length;
    useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 });
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline + 2);
    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline);
    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline + 2);
  });
});

describe('parametric ParameterBinding linking (#137)', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
  });
  afterEach(() => {
    resetWorkspaceStoreForTests();
  });

  it('linkParameterBinding(ConstraintUsage→ValueProperty) creates an edge', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const vp = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 200, y: 0 })!;
    const id = useWorkspaceStore
      .getState()
      .linkParameterBinding({
        source: cu,
        target: vp,
        sourceHandle: 'bottom',
        targetHandle: 'top',
      });
    expect(id).not.toBeNull();
    const edges = useWorkspaceStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]!.kind).toBe('ParameterBinding');
    expect(edges[0]!.sourceId).toBe(cu);
    expect(edges[0]!.targetId).toBe(vp);
  });

  it('canonicalises ValueProperty→ConstraintUsage to ConstraintUsage→ValueProperty', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const vp = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 200, y: 0 })!;
    useWorkspaceStore.getState().linkParameterBinding({
      source: vp,
      target: cu,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    const edges = useWorkspaceStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]!.sourceId).toBe(cu);
    expect(edges[0]!.targetId).toBe(vp);
  });

  it('rejects self-loops', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const id = useWorkspaceStore.getState().linkParameterBinding({
      source: cu,
      target: cu,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(id).toBeNull();
    expect(useWorkspaceStore.getState().edges).toHaveLength(0);
  });

  it('rejects duplicate edges between the same pair (either direction)', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const vp = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 200, y: 0 })!;
    const first = useWorkspaceStore.getState().linkParameterBinding({
      source: cu,
      target: vp,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(first).not.toBeNull();
    const dup = useWorkspaceStore.getState().linkParameterBinding({
      source: vp,
      target: cu,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(dup).toBeNull();
    expect(useWorkspaceStore.getState().edges).toHaveLength(1);
  });

  it('rejects connections with non-parametric endpoints', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    // Create a Requirement (foreign kind for the parametric viewpoint) by
    // opening a Requirements diagram first.
    const reqDiagram = useWorkspaceStore
      .getState()
      .createDiagram('requirements')!;
    const reqId = useWorkspaceStore
      .getState()
      .createRequirement(reqDiagram, { x: 0, y: 0 })!;
    const id = useWorkspaceStore.getState().linkParameterBinding({
      source: cu,
      target: reqId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(id).toBeNull();
  });

  it('setParameterBindingLabel round-trips with undo/redo', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const vp = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 0, y: 0 })!;
    const edgeId = useWorkspaceStore.getState().linkParameterBinding({
      source: cu,
      target: vp,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    })!;
    useWorkspaceStore.getState().setParameterBindingLabel(edgeId, 'm');
    const findLabel = (): string | undefined =>
      useWorkspaceStore
        .getState()
        .edges.find((e) => e.id === edgeId)?.label;
    expect(findLabel()).toBe('m');
    useWorkspaceStore.getState().undo();
    expect(findLabel()).toBeUndefined();
    useWorkspaceStore.getState().redo();
    expect(findLabel()).toBe('m');
  });

  it('undo of linkParameterBinding removes the edge', async () => {
    const diagramId = await bootstrapParametric();
    const cu = useWorkspaceStore
      .getState()
      .createConstraintUsage(diagramId, { x: 0, y: 0 })!;
    const vp = useWorkspaceStore
      .getState()
      .createValueProperty(diagramId, { x: 0, y: 0 })!;
    useWorkspaceStore.getState().linkParameterBinding({
      source: cu,
      target: vp,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(useWorkspaceStore.getState().edges).toHaveLength(1);
    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().edges).toHaveLength(0);
  });
});
