import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import type {
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  PortUsageElement,
} from '@/model';
import { createInMemorySessionRepository } from '@/repository';
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

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, repository, user };
}

function findPartDef(id: string): PartDefinitionElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find((e): e is PartDefinitionElement => e.id === id && e.kind === 'PartDefinition');
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
      expect(findPartDef(defId)?.portIds).toEqual([portId]);
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
      expect(findPartDef(defId)?.portIds).toEqual([]);
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
      expect(findPartDef(defId)?.portIds).toEqual([portId]);
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
      expect(findPartDef(defId)?.portIds).toEqual([]);
    });

    it('undo restores the port and the parent portIds entry', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const portId = useWorkspaceStore
        .getState()
        .addPortToDefinition(defId)!;
      useWorkspaceStore.getState().deletePort(portId);
      useWorkspaceStore.getState().undo();

      expect(findPartDef(defId)?.portIds).toEqual([portId]);
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
      expect(partUsage.portUsageIds).toHaveLength(2);

      for (const id of partUsage.portUsageIds) {
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
      const ibdId = useWorkspaceStore
        .getState()
        .createDiagram('ibd' as never, { name: 'Loose IBD' })!;
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
