import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { BDD_VIEWPOINT_ID, IBD_VIEWPOINT_ID } from '@/viewpoints';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
  type DiagramId,
} from '@/workspace';

import { mkElementId } from '../model/helpers';

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
}

describe('workspace store — navigation actions (issue #53)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  describe('showDefinitionOnBdd', () => {
    it('switches to the first BDD and selects the PartDefinition the usage is typed by', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      useWorkspaceStore.getState().renameElement(defId, 'Engine');
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const partUsageId = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      // Active diagram is now the IBD.
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(ibdId);

      const result = useWorkspaceStore
        .getState()
        .showDefinitionOnBdd(partUsageId);
      expect(result).not.toBeNull();
      const state = useWorkspaceStore.getState();
      const activeDiagram = state.diagrams.find(
        (d) => d.id === state.activeDiagramId,
      );
      expect(activeDiagram?.viewpointId).toBe(BDD_VIEWPOINT_ID);
      expect(state.selectedElementIds).toEqual([defId]);
    });

    it('returns null for a non-PartUsage element', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      expect(
        useWorkspaceStore.getState().showDefinitionOnBdd(defId),
      ).toBeNull();
    });

    it('returns null when no BDD diagram exists', async () => {
      await bootstrap();
      // Remove the default BDD diagram synthetically so only the IBD remains.
      const defId = useWorkspaceStore.getState().createBlock()!;
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      const partUsageId = useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      // Drop the BDD from state directly.
      useWorkspaceStore.setState({
        diagrams: useWorkspaceStore
          .getState()
          .diagrams.filter((d) => d.viewpointId !== BDD_VIEWPOINT_ID),
      });
      expect(
        useWorkspaceStore.getState().showDefinitionOnBdd(partUsageId),
      ).toBeNull();
    });

    it('returns null when the PartUsage id does not resolve', async () => {
      await bootstrap();
      const fake = mkElementId('does-not-exist');
      expect(useWorkspaceStore.getState().showDefinitionOnBdd(fake)).toBeNull();
    });
  });

  describe('navigateToElementOnDiagram', () => {
    it('switches active diagram and selects the element', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const ibdId = useWorkspaceStore.getState().openInternalDiagram(defId)!;
      useWorkspaceStore
        .getState()
        .createPartUsage(ibdId, defId, { x: 0, y: 0 })!;
      // Back to the BDD diagram.
      const bdd = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.viewpointId === BDD_VIEWPOINT_ID)!;
      useWorkspaceStore.getState().setActiveDiagram(bdd.id);

      useWorkspaceStore
        .getState()
        .navigateToElementOnDiagram(defId, ibdId);

      const state = useWorkspaceStore.getState();
      expect(state.activeDiagramId).toBe(ibdId);
      expect(state.selectedElementIds).toEqual([defId]);
    });

    it('is a no-op when the diagram id is unknown', async () => {
      await bootstrap();
      const defId = useWorkspaceStore.getState().createBlock()!;
      const beforeActive = useWorkspaceStore.getState().activeDiagramId;
      const beforeSelection = useWorkspaceStore.getState().selectedElementIds;

      useWorkspaceStore
        .getState()
        .navigateToElementOnDiagram(defId, 'missing' as DiagramId);

      expect(useWorkspaceStore.getState().activeDiagramId).toBe(beforeActive);
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual(
        beforeSelection,
      );
    });

    it('is a no-op when the element id does not exist in the registry', async () => {
      await bootstrap();
      const ibdId = useWorkspaceStore
        .getState()
        .createDiagram(IBD_VIEWPOINT_ID, { name: 'Loose IBD' })!;
      const beforeActive = useWorkspaceStore.getState().activeDiagramId;
      const beforeSelection = useWorkspaceStore.getState().selectedElementIds;

      useWorkspaceStore
        .getState()
        .navigateToElementOnDiagram(mkElementId('nope'), ibdId);

      expect(useWorkspaceStore.getState().activeDiagramId).toBe(beforeActive);
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual(
        beforeSelection,
      );
    });
  });
});
