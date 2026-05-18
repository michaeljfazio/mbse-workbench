import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import {
  createElementId,
  type ConnectionUsageElement,
  type ElementId,
  type ItemFlowElement,
  type PartUsageElement,
  type PortDefinitionElement,
  type PortUsageElement,
} from '@/model';
import { createInMemorySessionRepository } from '@/repository';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import { childIdsOf } from '../helpers/registryReaders';

function portIdsOf(parentId: ElementId): ElementId[] {
  return childIdsOf(useWorkspaceStore.getState().elements, parentId, 'port');
}

function portUsageIdsOf(parentId: ElementId): ElementId[] {
  return childIdsOf(useWorkspaceStore.getState().elements, parentId, 'port');
}

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

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, repository, user };
}

function findPartUsage(id: string): PartUsageElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find((e): e is PartUsageElement => e.id === id && e.kind === 'PartUsage');
}

describe('workspace store — IBD actions (issue #50)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  describe('addPortToDefinition', () => {
    it('creates a PortDefinition and appends its id to the parent portIds', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;

      expect(portId).not.toBeNull();
      const port = useWorkspaceStore
        .getState()
        .elements.find((e) => e.id === portId);
      expect(port?.kind).toBe('PortDefinition');
      expect(portIdsOf(defId)).toEqual([portId]);
    });

    it('defaults port name to portN and direction to inout', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;
      const port = useWorkspaceStore
        .getState()
        .elements.find((e): e is PortDefinitionElement => e.id === portId)!;
      expect(port.name).toBe('port1');
      expect(port.direction).toBe('inout');
    });

    it('honours explicit options.name and options.direction', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { name: 'fuel', direction: 'in' })!;
      const port = useWorkspaceStore
        .getState()
        .elements.find((e): e is PortDefinitionElement => e.id === portId)!;
      expect(port.name).toBe('fuel');
      expect(port.direction).toBe('in');
    });

    it('is a single compound — one undo step reverts both create + portIds patch', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;
      useWorkspaceStore.getState().undo();

      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === portId),
      ).toBeUndefined();
      expect(portIdsOf(defId)).toEqual([]);
    });

    it('redoes the port + portIds patch in one step', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;
      useWorkspaceStore.getState().undo();
      useWorkspaceStore.getState().redo();

      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === portId),
      ).toBeDefined();
      expect(portIdsOf(defId)).toEqual([portId]);
    });

    it('is a no-op when the parent id is not a PartDefinition', async () => {
      await bootstrap();
      const before = useWorkspaceStore.getState().modelVersion;
      const portId = useWorkspaceStore
        .getState()
        // valid-looking id that points at nothing
        .addPortToDefinition('does-not-exist' as never);
      expect(portId).toBeNull();
      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('deletePort', () => {
    it('removes the PortDefinition and updates the parent portIds in one compound', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;

      useWorkspaceStore.getState().deletePort(portId);

      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === portId),
      ).toBeUndefined();
      expect(portIdsOf(defId)).toEqual([]);
    });

    it('undo restores the port and the parent portIds entry', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;
      useWorkspaceStore.getState().deletePort(portId);
      useWorkspaceStore.getState().undo();

      expect(portIdsOf(defId)).toEqual([portId]);
      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === portId),
      ).toBeDefined();
    });

    it('is a no-op when the id does not point at a PortDefinition', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const before = useWorkspaceStore.getState().modelVersion;
      useWorkspaceStore.getState().deletePort(defId);
      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('setPortDirection', () => {
    it('updates the port direction', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { direction: 'in' })!;

      useWorkspaceStore.getState().setPortDirection(portId, 'out');

      const port = useWorkspaceStore
        .getState()
        .elements.find((e): e is PortDefinitionElement => e.id === portId)!;
      expect(port.direction).toBe('out');
    });

    it('is a no-op when the direction is unchanged', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { direction: 'in' })!;
      const before = useWorkspaceStore.getState().modelVersion;

      useWorkspaceStore.getState().setPortDirection(portId, 'in');

      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('createPartUsage', () => {
    it('creates a PartUsage with one PortUsage per port on the type and persists the diagram position', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { name: 'fuel', direction: 'in' });
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { name: 'power', direction: 'out' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const partUsageId = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 100, y: 50 })!;

      const partUsage = findPartUsage(partUsageId)!;
      expect(partUsage.kind).toBe('PartUsage');
      expect(partUsage.definitionId).toBe(defId);
      expect(portUsageIdsOf(partUsage.id)).toHaveLength(2);

      for (const id of portUsageIdsOf(partUsage.id)) {
        const portUsage = useWorkspaceStore
          .getState()
          .elements.find((e): e is PortUsageElement => e.id === id);
        expect(portUsage?.kind).toBe('PortUsage');
      }

      const diagram = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === ibdId)!;
      expect(diagram.positions[partUsageId]).toEqual({ x: 100, y: 50 });
    });

    it('names the PartUsage by lowercasing the definition name', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'Engine');
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      expect(findPartUsage(id)?.name).toBe('engine');
    });

    it('cascades suffix when the name is already taken', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'Engine');
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const a = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      const b = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 10, y: 10 })!;
      expect(findPartUsage(a)?.name).toBe('engine');
      expect(findPartUsage(b)?.name).toBe('engine2');
    });

    // Acronym PartDefinitions (all-uppercase, optionally with digits/underscores)
    // are auto-named with a numeric suffix instead of being first-char-lowered.
    // `PFC` → `PFC_1`, `PFC_2`. Mixed-case names keep the lowercased convention
    // (`Engine` → `engine`, `engine2`). Issue #500.
    it('names an acronym PartDefinition with a numeric suffix', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'PFC');
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const a = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      const b = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 10, y: 10 })!;
      expect(findPartUsage(a)?.name).toBe('PFC_1');
      expect(findPartUsage(b)?.name).toBe('PFC_2');
    });

    it('treats names with digits and underscores as acronyms if all-uppercase', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'ADIRU_3');
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      expect(findPartUsage(id)?.name).toBe('ADIRU_3_1');
    });

    it('one undo step reverts the whole compound (PortUsages + PartUsage + position)', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defId, { name: 'p', direction: 'in' });
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const before = useWorkspaceStore.getState().elements.length;

      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      expect(useWorkspaceStore.getState().elements.length).toBe(before + 2); // 1 PartUsage + 1 PortUsage

      useWorkspaceStore.getState().undo();

      expect(useWorkspaceStore.getState().elements.length).toBe(before);
      const diagram = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === ibdId)!;
      expect(diagram.positions[id]).toBeUndefined();
    });

    it('is a no-op when the definitionId is not a PartDefinition', async () => {
      await bootstrap();
      const ibdId = useWorkspaceStore.getState().createDiagram('ibd' as never, {
        name: 'Loose IBD',
        context: { kind: 'partDefinition', id: createElementId() },
      })!;
      const before = useWorkspaceStore.getState().modelVersion;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, 'missing' as never, { x: 0, y: 0 });
      expect(id).toBeNull();
      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('setPartUsageMultiplicity', () => {
    it('updates the multiplicity field', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;

      useWorkspaceStore.getState().setPartUsageMultiplicity(id, '1..*');

      expect(findPartUsage(id)?.multiplicity).toBe('1..*');
    });

    it('empty string clears the multiplicity', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      useWorkspaceStore.getState().setPartUsageMultiplicity(id, '0..1');

      useWorkspaceStore.getState().setPartUsageMultiplicity(id, '');

      expect(findPartUsage(id)?.multiplicity).toBeUndefined();
    });

    it('is a no-op when value is unchanged', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const id = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      useWorkspaceStore.getState().setPartUsageMultiplicity(id, '1');
      const before = useWorkspaceStore.getState().modelVersion;

      useWorkspaceStore.getState().setPartUsageMultiplicity(id, '1');

      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('connectPorts', () => {
    async function seedTwoParts(): Promise<{
      partA: PartUsageElement;
      partB: PartUsageElement;
    }> {
      await bootstrap();
      // Two distinct PartDefinitions, each with one port of complementary
      // direction. This is the minimum needed for a valid IBD connection.
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defA, 'Producer');
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'out' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defB, 'Consumer');
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'in' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defA, { x: 0, y: 0 })!;
      const b = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defB, { x: 200, y: 0 })!;
      return {
        partA: findPartUsage(a)!,
        partB: findPartUsage(b)!,
      };
    }

    it('creates a ConnectionUsage element when the drag passes typed validation', async () => {
      const { partA, partB } = await seedTwoParts();
      const id = useWorkspaceStore.getState().connectPorts({
        source: partA.id,
        target: partB.id,
        sourceHandle: portUsageIdsOf(partA.id)[0]!,
        targetHandle: portUsageIdsOf(partB.id)[0]!,
      })!;

      const connection = useWorkspaceStore
        .getState()
        .elements.find((e): e is ConnectionUsageElement => e.id === id);
      expect(connection?.kind).toBe('ConnectionUsage');
      expect(connection?.sourceId).toBe(portUsageIdsOf(partA.id)[0]);
      expect(connection?.targetId).toBe(portUsageIdsOf(partB.id)[0]);
    });

    it('canonicalises in → out drags so the saved source is the out port', async () => {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'in' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'out' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const aId = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defA, { x: 0, y: 0 })!;
      const bId = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defB, { x: 200, y: 0 })!;
      const a = findPartUsage(aId)!;
      const b = findPartUsage(bId)!;

      const inPortUsage = portUsageIdsOf(a.id)[0]!;
      const outPortUsage = portUsageIdsOf(b.id)[0]!;
      const id = useWorkspaceStore.getState().connectPorts({
        source: a.id,
        target: b.id,
        sourceHandle: inPortUsage,
        targetHandle: outPortUsage,
      })!;

      const connection = useWorkspaceStore
        .getState()
        .elements.find((e): e is ConnectionUsageElement => e.id === id)!;
      expect(connection.sourceId).toBe(outPortUsage);
      expect(connection.targetId).toBe(inPortUsage);
    });

    it('rejects in ↔ in', async () => {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'in' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'in' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 0 })!,
      )!;
      const b = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 0 })!,
      )!;

      const id = useWorkspaceStore.getState().connectPorts({
        source: a.id,
        target: b.id,
        sourceHandle: portUsageIdsOf(a.id)[0]!,
        targetHandle: portUsageIdsOf(b.id)[0]!,
      });
      expect(id).toBeNull();
    });

    it('one undo step deletes the ConnectionUsage element', async () => {
      const { partA, partB } = await seedTwoParts();
      const id = useWorkspaceStore.getState().connectPorts({
        source: partA.id,
        target: partB.id,
        sourceHandle: portUsageIdsOf(partA.id)[0]!,
        targetHandle: portUsageIdsOf(partB.id)[0]!,
      })!;
      useWorkspaceStore.getState().undo();

      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === id),
      ).toBeUndefined();
    });

    it('cascades default names connection1, connection2, …', async () => {
      const { partA, partB } = await seedTwoParts();
      // Add another out port and another in port so we can wire two connections.
      const defA = partA.definitionId as ElementId;
      const defB = partB.definitionId as ElementId;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p2', direction: 'out' });
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p2', direction: 'in' });

      // PartUsages created before the new ports were added do not gain new
      // PortUsages — recreate fresh PartUsages so both ports are bound.
      const ibdId = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.viewpointId === 'ibd')!.id;
      const a2 = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 200 })!,
      )!;
      const b2 = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 200 })!,
      )!;

      const first = useWorkspaceStore.getState().connectPorts({
        source: a2.id,
        target: b2.id,
        sourceHandle: portUsageIdsOf(a2.id)[0]!,
        targetHandle: portUsageIdsOf(b2.id)[0]!,
      })!;
      const second = useWorkspaceStore.getState().connectPorts({
        source: a2.id,
        target: b2.id,
        sourceHandle: portUsageIdsOf(a2.id)[1]!,
        targetHandle: portUsageIdsOf(b2.id)[1]!,
      })!;
      const firstEl = useWorkspaceStore
        .getState()
        .elements.find((e): e is ConnectionUsageElement => e.id === first)!;
      const secondEl = useWorkspaceStore
        .getState()
        .elements.find((e): e is ConnectionUsageElement => e.id === second)!;
      expect(firstEl.name).toBe('connection1');
      expect(secondEl.name).toBe('connection2');
    });
  });

  describe('connectItemFlow — #52', () => {
    async function seedItemFlowParts(): Promise<{
      partA: PartUsageElement;
      partB: PartUsageElement;
    }> {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defA, 'Producer');
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'out' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defB, 'Consumer');
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'in' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defA, { x: 0, y: 0 })!;
      const b = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defB, { x: 200, y: 0 })!;
      return {
        partA: findPartUsage(a)!,
        partB: findPartUsage(b)!,
      };
    }

    it('creates an ItemFlow element when the drag passes typed validation', async () => {
      const { partA, partB } = await seedItemFlowParts();
      const id = useWorkspaceStore.getState().connectItemFlow({
        source: partA.id,
        target: partB.id,
        sourceHandle: portUsageIdsOf(partA.id)[0]!,
        targetHandle: portUsageIdsOf(partB.id)[0]!,
      })!;

      const flow = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === id);
      expect(flow?.kind).toBe('ItemFlow');
      expect(flow?.sourceId).toBe(portUsageIdsOf(partA.id)[0]);
      expect(flow?.targetId).toBe(portUsageIdsOf(partB.id)[0]);
      expect(flow?.itemType).toBeUndefined();
    });

    it('canonicalises in → out drags so the saved source is the out port', async () => {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'in' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'out' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 0 })!,
      )!;
      const b = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 0 })!,
      )!;

      const inPortUsage = portUsageIdsOf(a.id)[0]!;
      const outPortUsage = portUsageIdsOf(b.id)[0]!;
      const id = useWorkspaceStore.getState().connectItemFlow({
        source: a.id,
        target: b.id,
        sourceHandle: inPortUsage,
        targetHandle: outPortUsage,
      })!;

      const flow = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === id)!;
      expect(flow.sourceId).toBe(outPortUsage);
      expect(flow.targetId).toBe(inPortUsage);
    });

    it('rejects in ↔ in', async () => {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'in' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'in' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 0 })!,
      )!;
      const b = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 0 })!,
      )!;

      const id = useWorkspaceStore.getState().connectItemFlow({
        source: a.id,
        target: b.id,
        sourceHandle: portUsageIdsOf(a.id)[0]!,
        targetHandle: portUsageIdsOf(b.id)[0]!,
      });
      expect(id).toBeNull();
    });

    it('accepts inout ↔ inout', async () => {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'inout' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'inout' });

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 0 })!,
      )!;
      const b = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 0 })!,
      )!;

      const id = useWorkspaceStore.getState().connectItemFlow({
        source: a.id,
        target: b.id,
        sourceHandle: portUsageIdsOf(a.id)[0]!,
        targetHandle: portUsageIdsOf(b.id)[0]!,
      });
      expect(id).not.toBeNull();
    });

    it('cascades default names flow1, flow2, …', async () => {
      const { partA, partB } = await seedItemFlowParts();
      const defA = partA.definitionId as ElementId;
      const defB = partB.definitionId as ElementId;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p2', direction: 'out' });
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p2', direction: 'in' });

      const ibdId = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.viewpointId === 'ibd')!.id;
      const a2 = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 200 })!,
      )!;
      const b2 = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 200 })!,
      )!;

      const first = useWorkspaceStore.getState().connectItemFlow({
        source: a2.id,
        target: b2.id,
        sourceHandle: portUsageIdsOf(a2.id)[0]!,
        targetHandle: portUsageIdsOf(b2.id)[0]!,
      })!;
      const second = useWorkspaceStore.getState().connectItemFlow({
        source: a2.id,
        target: b2.id,
        sourceHandle: portUsageIdsOf(a2.id)[1]!,
        targetHandle: portUsageIdsOf(b2.id)[1]!,
      })!;
      const firstEl = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === first)!;
      const secondEl = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === second)!;
      expect(firstEl.name).toBe('flow1');
      expect(secondEl.name).toBe('flow2');
    });

    it('one undo step deletes the ItemFlow element', async () => {
      const { partA, partB } = await seedItemFlowParts();
      const id = useWorkspaceStore.getState().connectItemFlow({
        source: partA.id,
        target: partB.id,
        sourceHandle: portUsageIdsOf(partA.id)[0]!,
        targetHandle: portUsageIdsOf(partB.id)[0]!,
      })!;
      useWorkspaceStore.getState().undo();
      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === id),
      ).toBeUndefined();
    });
  });

  describe('setItemFlowType — #52', () => {
    async function seedFlow(): Promise<ElementId> {
      await bootstrap();
      const defA = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defA, { name: 'p', direction: 'out' });
      const defB = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore
        .getState()
        .addPortToDefinition(defB, { name: 'p', direction: 'in' });
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
      const a = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defA, { x: 0, y: 0 })!,
      )!;
      const b = findPartUsage(
        useWorkspaceStore
          .getState()
          .createPartUsage(ibdId, defB, { x: 200, y: 0 })!,
      )!;
      return useWorkspaceStore.getState().connectItemFlow({
        source: a.id,
        target: b.id,
        sourceHandle: portUsageIdsOf(a.id)[0]!,
        targetHandle: portUsageIdsOf(b.id)[0]!,
      })!;
    }

    it('updates the itemType field', async () => {
      const id = await seedFlow();
      useWorkspaceStore.getState().setItemFlowType(id, 'Fuel');
      const flow = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === id)!;
      expect(flow.itemType).toBe('Fuel');
    });

    it('empty string clears the itemType', async () => {
      const id = await seedFlow();
      useWorkspaceStore.getState().setItemFlowType(id, 'Fuel');
      useWorkspaceStore.getState().setItemFlowType(id, '');
      const flow = useWorkspaceStore
        .getState()
        .elements.find((e): e is ItemFlowElement => e.id === id)!;
      expect(flow.itemType).toBeUndefined();
    });

    it('is a no-op when value is unchanged', async () => {
      const id = await seedFlow();
      useWorkspaceStore.getState().setItemFlowType(id, 'Fuel');
      const before = useWorkspaceStore.getState().modelVersion;
      useWorkspaceStore.getState().setItemFlowType(id, 'Fuel');
      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });

    it('is a no-op when id does not point at an ItemFlow', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const before = useWorkspaceStore.getState().modelVersion;
      useWorkspaceStore.getState().setItemFlowType(defId, 'Fuel');
      expect(useWorkspaceStore.getState().modelVersion).toBe(before);
    });
  });

  describe('openInternalDiagram', () => {
    it('creates a new IBD diagram bound to the PartDefinition and activates it', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'Engine');

      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;

      const diagram = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === ibdId)!;
      expect(diagram.viewpointId).toBe('ibd');
      expect(diagram.name).toBe('Engine IBD');
      expect(diagram.context).toEqual({ kind: 'partDefinition', id: defId });
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(ibdId);
    });

    it('reuses an existing IBD diagram for the same PartDefinition', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const first = useWorkspaceStore
        .getState()
        .openInternalDiagram(defId);
      // Switch back to the BDD
      const bddId = useWorkspaceStore.getState().diagrams[0]!.id;
      useWorkspaceStore.getState().setActiveDiagram(bddId);

      const second = useWorkspaceStore
        .getState()
        .openInternalDiagram(defId);

      expect(second).toBe(first);
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(first);
    });

    it('returns null when the id is not a PartDefinition', async () => {
      await bootstrap();
      const id = useWorkspaceStore
        .getState()
        .openInternalDiagram('missing' as never);
      expect(id).toBeNull();
    });
  });
});
