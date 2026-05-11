import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import type { ElementId, RequirementElement } from '@/model';
import { createInMemorySessionRepository } from '@/repository';
import {
  getActiveDiagram,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
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
  return { storage, repository, user };
}

function findRequirement(id: ElementId): RequirementElement {
  const el = useWorkspaceStore.getState().elements.find((e) => e.id === id);
  if (!el || el.kind !== 'Requirement') {
    throw new Error(`element ${id} is not a Requirement`);
  }
  return el;
}

describe('workspace store — Requirements actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createRequirement adds a Requirement, defaults priority/status, names + reqId cascade', async () => {
    await bootstrap();
    const s0 = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s0)!.id;

    const a = s0.createRequirement(diagramId, { x: 40, y: 40 });
    const b = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 80, y: 80 });
    const c = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 120, y: 120 });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(c).not.toBeNull();

    const reqA = findRequirement(a!);
    const reqB = findRequirement(b!);
    const reqC = findRequirement(c!);

    expect(reqA.name).toBe('Req1');
    expect(reqB.name).toBe('Req2');
    expect(reqC.name).toBe('Req3');

    expect(reqA.reqId).toBe('R-001');
    expect(reqB.reqId).toBe('R-002');
    expect(reqC.reqId).toBe('R-003');

    expect(reqA.priority).toBe('medium');
    expect(reqA.status).toBe('draft');
    expect(reqA.text).toBe('');
    expect(reqA.rationale).toBeUndefined();

    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(active.positions[a!]).toEqual({ x: 40, y: 40 });
    expect(active.positions[b!]).toEqual({ x: 80, y: 80 });
  });

  it('createRequirement honours options overrides for name, reqId, text, priority, status, rationale', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(
      diagramId,
      { x: 0, y: 0 },
      {
        name: 'Custom Name',
        reqId: 'SAFETY-42',
        text: 'The system shall do X.',
        priority: 'critical',
        status: 'approved',
        rationale: 'Compliance with ISO-26262.',
      },
    );
    const req = findRequirement(id!);
    expect(req.name).toBe('Custom Name');
    expect(req.reqId).toBe('SAFETY-42');
    expect(req.text).toBe('The system shall do X.');
    expect(req.priority).toBe('critical');
    expect(req.status).toBe('approved');
    expect(req.rationale).toBe('Compliance with ISO-26262.');
  });

  it('createRequirement returns null when the diagram is unknown', async () => {
    await bootstrap();
    const id = useWorkspaceStore
      .getState()
      .createRequirement(mkElementId('no-such-diagram') as never, {
        x: 0,
        y: 0,
      });
    expect(id).toBeNull();
  });

  it('createRequirement undo reverts both the element and the position in one step', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(diagramId, { x: 30, y: 30 })!;

    const beforeUndo = useWorkspaceStore.getState();
    expect(beforeUndo.elements.some((e) => e.id === id)).toBe(true);
    expect(
      getActiveDiagram(beforeUndo)!.positions[id],
    ).toEqual({ x: 30, y: 30 });

    useWorkspaceStore.getState().undo();

    const afterUndo = useWorkspaceStore.getState();
    expect(afterUndo.elements.some((e) => e.id === id)).toBe(false);
    expect(getActiveDiagram(afterUndo)!.positions[id]).toBeUndefined();
  });

  it('setRequirementReqId trims, clears on empty, no-op on unchanged', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(diagramId, { x: 0, y: 0 })!;

    useWorkspaceStore.getState().setRequirementReqId(id, '  R-999  ');
    expect(findRequirement(id).reqId).toBe('R-999');

    const v0 = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().setRequirementReqId(id, 'R-999');
    expect(useWorkspaceStore.getState().modelVersion).toBe(v0);

    useWorkspaceStore.getState().setRequirementReqId(id, '');
    expect(findRequirement(id).reqId).toBeUndefined();
  });

  it('setRequirementText round-trips and is a no-op when value unchanged', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(diagramId, { x: 0, y: 0 })!;

    useWorkspaceStore.getState().setRequirementText(id, 'shall fly');
    expect(findRequirement(id).text).toBe('shall fly');

    const v0 = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().setRequirementText(id, 'shall fly');
    expect(useWorkspaceStore.getState().modelVersion).toBe(v0);
  });

  it('setRequirementPriority and setRequirementStatus update the model and undo restores prior values', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(diagramId, { x: 0, y: 0 })!;

    useWorkspaceStore.getState().setRequirementPriority(id, 'critical');
    useWorkspaceStore.getState().setRequirementStatus(id, 'verified');
    expect(findRequirement(id).priority).toBe('critical');
    expect(findRequirement(id).status).toBe('verified');

    useWorkspaceStore.getState().undo();
    expect(findRequirement(id).status).toBe('draft');
    useWorkspaceStore.getState().undo();
    expect(findRequirement(id).priority).toBe('medium');

    useWorkspaceStore.getState().redo();
    expect(findRequirement(id).priority).toBe('critical');
  });

  it('setRequirementRationale clears on empty and is a no-op when unchanged', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    const id = s.createRequirement(diagramId, { x: 0, y: 0 })!;

    useWorkspaceStore
      .getState()
      .setRequirementRationale(id, 'Required by spec');
    expect(findRequirement(id).rationale).toBe('Required by spec');

    const v0 = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore
      .getState()
      .setRequirementRationale(id, 'Required by spec');
    expect(useWorkspaceStore.getState().modelVersion).toBe(v0);

    useWorkspaceStore.getState().setRequirementRationale(id, '   ');
    expect(findRequirement(id).rationale).toBeUndefined();
  });

  it('setters are no-ops when the element id is unknown or not a Requirement', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    s.createRequirement(diagramId, { x: 0, y: 0 });
    const blockId = useWorkspaceStore.getState().createBlock()!;
    const before = useWorkspaceStore.getState().modelVersion;
    const unknown = mkElementId('does-not-exist');

    useWorkspaceStore.getState().setRequirementText(unknown, 'X');
    useWorkspaceStore.getState().setRequirementReqId(blockId, 'R-x');
    useWorkspaceStore.getState().setRequirementPriority(blockId, 'high');
    useWorkspaceStore.getState().setRequirementStatus(blockId, 'rejected');
    useWorkspaceStore.getState().setRequirementRationale(unknown, 'X');

    expect(useWorkspaceStore.getState().modelVersion).toBe(before);
  });

  it('reqId cascade picks the next free id when some are already taken', async () => {
    await bootstrap();
    const s = useWorkspaceStore.getState();
    const diagramId = getActiveDiagram(s)!.id;
    s.createRequirement(diagramId, { x: 0, y: 0 }, { reqId: 'R-002' });
    s.createRequirement(diagramId, { x: 0, y: 0 }, { reqId: 'R-003' });
    const third = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    expect(findRequirement(third!).reqId).toBe('R-001');
    const fourth = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    expect(findRequirement(fourth!).reqId).toBe('R-004');
  });
});

describe('workspace store — RequirementTrace actions (#72)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  async function setup() {
    await bootstrap();
    const reqDiagramId = useWorkspaceStore
      .getState()
      .createDiagram('requirements', { name: 'Reqs' })!;
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(reqDiagramId, { x: 0, y: 0 }, { name: 'R1' })!;
    const r2 = useWorkspaceStore
      .getState()
      .createRequirement(reqDiagramId, { x: 200, y: 0 }, { name: 'R2' })!;
    return { reqDiagramId, r1, r2 };
  }

  it('linkRequirementTrace creates a RequirementTraceEdge with the chosen kind', async () => {
    const { r1, r2 } = await setup();
    const id = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1, r2, 'satisfy');
    expect(id).not.toBeNull();
    const edge = useWorkspaceStore.getState().edges.find((e) => e.id === id);
    expect(edge?.kind).toBe('RequirementTrace');
    expect(
      edge?.kind === 'RequirementTrace' ? edge.traceKind : null,
    ).toBe('satisfy');
  });

  it('linkRequirementTrace returns null when source is not a Requirement', async () => {
    await setup();
    // Create a Block to use as a bogus source.
    const block = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 })!;
    const r1 = useWorkspaceStore
      .getState()
      .elements.filter((e) => e.kind === 'Requirement')[0]!;
    const id = useWorkspaceStore
      .getState()
      .linkRequirementTrace(block, r1.id, 'satisfy');
    expect(id).toBeNull();
  });

  it('linkRequirementTrace rejects derive/refine when target is not a Requirement', async () => {
    await setup();
    const block = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 })!;
    const r1 = useWorkspaceStore
      .getState()
      .elements.filter((e) => e.kind === 'Requirement')[0]!;
    expect(
      useWorkspaceStore
        .getState()
        .linkRequirementTrace(r1.id, block, 'derive'),
    ).toBeNull();
    expect(
      useWorkspaceStore
        .getState()
        .linkRequirementTrace(r1.id, block, 'refine'),
    ).toBeNull();
    // satisfy / verify allow PartDefinition targets.
    expect(
      useWorkspaceStore
        .getState()
        .linkRequirementTrace(r1.id, block, 'satisfy'),
    ).not.toBeNull();
  });

  it('setRequirementTraceLabel commits a label and undoes back to undefined', async () => {
    const { r1, r2 } = await setup();
    const id = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1, r2, 'satisfy')!;
    useWorkspaceStore.getState().setRequirementTraceLabel(id, 'covers');
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === id)?.label,
    ).toBe('covers');
    useWorkspaceStore.getState().undo();
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === id)?.label,
    ).toBeUndefined();
  });

  it('setRequirementTraceLabel("") clears the existing label', async () => {
    const { r1, r2 } = await setup();
    const id = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1, r2, 'satisfy')!;
    useWorkspaceStore.getState().setRequirementTraceLabel(id, 'covers');
    useWorkspaceStore.getState().setRequirementTraceLabel(id, '');
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === id)?.label,
    ).toBeUndefined();
  });
});
