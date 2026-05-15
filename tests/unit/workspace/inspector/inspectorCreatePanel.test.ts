import { describe, expect, it, vi } from 'vitest';

import type { ActionNodeType, StateNodeType } from '@/model';
import type { ElementId } from '@/model';
import type { Diagram, DiagramId, NodePosition } from '@/workspace/diagram';
import {
  cascadeBoxForAction,
  cascadePosition,
  dispatchInspectorCreate,
  inspectorCreatePanel,
  type InspectorCreateStoreActions,
} from '@/workspace/inspector/inspectorCreatePanel';
import {
  activityViewpoint,
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
  bddViewpoint,
  ibdViewpoint,
  packageViewpoint,
  parametricViewpoint,
  requirementsViewpoint,
  stateMachineViewpoint,
  useCaseViewpoint,
} from '@/viewpoints';

const DIAGRAM: Pick<Diagram, 'id' | 'positions'> = {
  id: 'diagram-1' as DiagramId,
  positions: {},
};

function mockStore(): InspectorCreateStoreActions & {
  calls: Record<string, unknown[]>;
} {
  const calls: Record<string, unknown[]> = {};
  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls[name] = args;
      return `new-${name}` as never;
    });
  return {
    createBlock: record('createBlock'),
    createRequirement: record('createRequirement'),
    createActionUsage: record('createActionUsage'),
    createStateUsage: record('createStateUsage'),
    createActor: record('createActor'),
    createUseCase: record('createUseCase'),
    createConstraintUsage: record('createConstraintUsage'),
    createValueProperty: record('createValueProperty'),
    createPackage: record('createPackage'),
    calls,
  };
}

describe('inspectorCreatePanel', () => {
  it('returns one + New <label> action per BDD palette item', () => {
    const { actions, notices } = inspectorCreatePanel(bddViewpoint);
    expect(notices).toHaveLength(0);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      key: 'PartDefinition',
      label: '+ New Block',
      elementKind: 'PartDefinition',
    });
  });

  it('emits seven actions for Activity (one per ActionNodeType)', () => {
    const { actions } = inspectorCreatePanel(activityViewpoint);
    expect(actions.map((a) => a.key)).toEqual([
      'ActionUsage.action',
      'ActionUsage.initial',
      'ActionUsage.final',
      'ActionUsage.fork',
      'ActionUsage.join',
      'ActionUsage.decision',
      'ActionUsage.merge',
    ]);
    expect(actions[0]?.defaultData?.['nodeType']).toBe('action');
    expect(actions[3]?.label).toBe('+ New Fork');
  });

  it('emits three actions for State Machine (one per StateNodeType)', () => {
    const { actions } = inspectorCreatePanel(stateMachineViewpoint);
    expect(actions.map((a) => a.key)).toEqual([
      'StateUsage.state',
      'StateUsage.initial',
      'StateUsage.final',
    ]);
    expect(actions[2]?.defaultData?.['stateType']).toBe('final');
  });

  it('emits two actions for Use Case and Parametric', () => {
    expect(inspectorCreatePanel(useCaseViewpoint).actions.map((a) => a.key)).toEqual([
      'Actor',
      'UseCase',
    ]);
    expect(
      inspectorCreatePanel(parametricViewpoint).actions.map((a) => a.key),
    ).toEqual(['ConstraintUsage', 'ValueProperty']);
  });

  it('emits one action for Requirements and Package', () => {
    expect(
      inspectorCreatePanel(requirementsViewpoint).actions.map((a) => a.label),
    ).toEqual(['+ New Requirement']);
    expect(
      inspectorCreatePanel(packageViewpoint).actions.map((a) => a.label),
    ).toEqual(['+ New Package']);
  });

  it('replaces IBD PartUsage with a drag-hint notice (no button)', () => {
    const { actions, notices } = inspectorCreatePanel(ibdViewpoint);
    expect(actions).toHaveLength(0);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      key: 'notice.PartUsage',
      label: '+ New Part',
    });
    expect(notices[0]?.description).toMatch(/drag from the palette/i);
  });
});

describe('cascadePosition', () => {
  it('places the first element at the origin offset', () => {
    expect(cascadePosition(0, { width: 100, height: 60 })).toEqual({
      x: 60,
      y: 60,
    });
  });

  it('walks two columns then wraps to the next row', () => {
    const box = { width: 100, height: 60 };
    expect(cascadePosition(1, box)).toEqual({ x: 60 + 140, y: 60 });
    expect(cascadePosition(2, box)).toEqual({ x: 60, y: 60 + 100 });
    expect(cascadePosition(3, box)).toEqual({ x: 60 + 140, y: 60 + 100 });
  });

  it('respects custom column count + gaps', () => {
    expect(
      cascadePosition(2, { width: 50, height: 50 }, { columns: 3, gapX: 10, gapY: 5 }),
    ).toEqual({ x: 60 + 2 * 60, y: 60 });
  });
});

describe('cascadeBoxForAction', () => {
  it('uses per-kind dimensions from the viewpoint constants', () => {
    const [block] = inspectorCreatePanel(bddViewpoint).actions;
    expect(cascadeBoxForAction(block!)).toEqual({
      width: BDD_BLOCK_WIDTH,
      height: BDD_BLOCK_HEIGHT,
    });
  });

  it('discriminates Activity pseudostates via defaultData.nodeType', () => {
    const { actions } = inspectorCreatePanel(activityViewpoint);
    const decision = actions.find((a) => a.key === 'ActionUsage.decision')!;
    const action = actions.find((a) => a.key === 'ActionUsage.action')!;
    expect(cascadeBoxForAction(decision)).not.toEqual(cascadeBoxForAction(action));
  });
});

describe('dispatchInspectorCreate', () => {
  it('routes PartDefinition → createBlock with cascade position', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(bddViewpoint);
    dispatchInspectorCreate({ action: actions[0]!, diagram: DIAGRAM }, store);
    expect(store.calls['createBlock']).toEqual([{ x: 60, y: 60 }]);
  });

  it('routes Requirement → createRequirement(diagramId, pos)', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(requirementsViewpoint);
    dispatchInspectorCreate({ action: actions[0]!, diagram: DIAGRAM }, store);
    expect(store.calls['createRequirement']).toEqual([
      DIAGRAM.id,
      { x: 60, y: 60 },
    ]);
  });

  it('forwards ActionUsage defaultData.nodeType to createActionUsage', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(activityViewpoint);
    const fork = actions.find((a) => a.key === 'ActionUsage.fork')!;
    dispatchInspectorCreate({ action: fork, diagram: DIAGRAM }, store);
    const args = store.calls['createActionUsage'] as [
      DiagramId,
      NodePosition,
      ActionNodeType,
    ];
    expect(args[0]).toBe(DIAGRAM.id);
    expect(args[2]).toBe('fork');
  });

  it('forwards StateUsage defaultData.stateType to createStateUsage', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(stateMachineViewpoint);
    const initial = actions.find((a) => a.key === 'StateUsage.initial')!;
    dispatchInspectorCreate({ action: initial, diagram: DIAGRAM }, store);
    const args = store.calls['createStateUsage'] as [
      DiagramId,
      NodePosition,
      StateNodeType,
    ];
    expect(args[2]).toBe('initial');
  });

  it('routes Use Case Actor + UseCase to their store actions', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(useCaseViewpoint);
    dispatchInspectorCreate(
      { action: actions.find((a) => a.key === 'Actor')!, diagram: DIAGRAM },
      store,
    );
    dispatchInspectorCreate(
      { action: actions.find((a) => a.key === 'UseCase')!, diagram: DIAGRAM },
      store,
    );
    expect(store.calls['createActor']?.[0]).toBe(DIAGRAM.id);
    expect(store.calls['createUseCase']?.[0]).toBe(DIAGRAM.id);
  });

  it('routes Parametric Constraint + Value to their store actions', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(parametricViewpoint);
    dispatchInspectorCreate(
      {
        action: actions.find((a) => a.key === 'ConstraintUsage')!,
        diagram: DIAGRAM,
      },
      store,
    );
    dispatchInspectorCreate(
      {
        action: actions.find((a) => a.key === 'ValueProperty')!,
        diagram: DIAGRAM,
      },
      store,
    );
    expect(store.calls['createConstraintUsage']?.[0]).toBe(DIAGRAM.id);
    expect(store.calls['createValueProperty']?.[0]).toBe(DIAGRAM.id);
  });

  it('routes Package to createPackage', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(packageViewpoint);
    dispatchInspectorCreate({ action: actions[0]!, diagram: DIAGRAM }, store);
    expect(store.calls['createPackage']?.[0]).toBe(DIAGRAM.id);
  });

  it('advances cascade index based on existing positions count', () => {
    const store = mockStore();
    const { actions } = inspectorCreatePanel(bddViewpoint);
    dispatchInspectorCreate(
      {
        action: actions[0]!,
        diagram: {
          id: DIAGRAM.id,
          positions: {
            ['a' as ElementId]: { x: 0, y: 0 },
            ['b' as ElementId]: { x: 0, y: 0 },
          },
        },
      },
      store,
    );
    // 2 existing → cascadeIndex=2 → column 0 row 1 → y advances by box.height+40
    expect(store.calls['createBlock']).toEqual([
      { x: 60, y: 60 + (BDD_BLOCK_HEIGHT + 40) },
    ]);
  });
});
