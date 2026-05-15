// Phase 13 / T-13.07 — Inspector empty-state contextual "+ New …" panel.
//
// When nothing is selected on the active diagram, the Inspector pane today
// reads "Select an element to edit its properties." with no creation
// affordance. This module turns that empty state into a contextual launchpad:
// one button per palette item of the active viewpoint, dispatching to the
// same store action that the canvas toolbar "+ Add" / drop path uses.
//
// Riding on `viewpoint.paletteItems` keeps the kinds list authoritative in
// one place. The dispatcher reads `paletteItem.defaultData.{nodeType,
// stateType}` so the seven Activity pseudostates and three State pseudostates
// each surface as their own button without forking the kinds list.
//
// IBD's PartUsage is the lone exclusion — creating one requires a
// PartDefinition picker (PartUsageTypePopover) that only the canvas surface
// owns. The inspector surfaces a `notice` row instead, pointing the operator
// at the palette drag affordance.
//
// Cascade positioning mirrors the CanvasPane toolbar handlers
// (`handleAddBlock` et al.): a two-column grid offset by 60px from the
// top-left of the diagram, with each new element placed at the next cell.

import {
  isActionNodeType,
  isStateNodeType,
  type ActionNodeType,
  type ElementId,
  type ElementKind,
  type StateNodeType,
} from '@/model';
import type { Diagram, DiagramId, NodePosition } from '@/workspace/diagram';
import {
  ACTIVITY_ACTION_HEIGHT,
  ACTIVITY_ACTION_WIDTH,
  actionNodeSize,
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_WIDTH,
  PACKAGE_NODE_HEIGHT,
  PACKAGE_NODE_WIDTH,
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  stateNodeSize,
  USE_CASE_ACTOR_HEIGHT,
  USE_CASE_ACTOR_WIDTH,
  USE_CASE_USE_CASE_HEIGHT,
  USE_CASE_USE_CASE_WIDTH,
  type PaletteItem,
  type Viewpoint,
} from '@/viewpoints';

export interface InspectorCreateAction {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
  readonly elementKind: ElementKind;
  readonly defaultData?: Readonly<Record<string, unknown>>;
}

export interface InspectorCreateNotice {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface InspectorCreatePanel {
  readonly actions: readonly InspectorCreateAction[];
  readonly notices: readonly InspectorCreateNotice[];
}

interface NoticeBuilder {
  (item: PaletteItem): InspectorCreateNotice;
}

const INSPECTOR_NOTICES_BY_KIND: Readonly<
  Partial<Record<ElementKind, NoticeBuilder>>
> = {
  PartUsage: (item) => ({
    key: noticeKey(item),
    label: `+ New ${item.label}`,
    description:
      'Drag from the palette onto the canvas to choose a Part Definition.',
  }),
};

function actionKey(item: PaletteItem): string {
  const variant =
    (item.defaultData?.['nodeType'] as string | undefined) ??
    (item.defaultData?.['stateType'] as string | undefined) ??
    null;
  return variant ? `${item.elementKind}.${variant}` : item.elementKind;
}

function noticeKey(item: PaletteItem): string {
  return `notice.${actionKey(item)}`;
}

export function inspectorCreatePanel(viewpoint: Viewpoint): InspectorCreatePanel {
  const actions: InspectorCreateAction[] = [];
  const notices: InspectorCreateNotice[] = [];
  for (const item of viewpoint.paletteItems) {
    const noticeBuilder = INSPECTOR_NOTICES_BY_KIND[item.elementKind];
    if (noticeBuilder) {
      notices.push(noticeBuilder(item));
      continue;
    }
    actions.push({
      key: actionKey(item),
      label: `+ New ${item.label}`,
      ...(item.description !== undefined
        ? { description: item.description }
        : {}),
      elementKind: item.elementKind,
      ...(item.defaultData !== undefined
        ? { defaultData: item.defaultData }
        : {}),
    });
  }
  return { actions, notices };
}

export interface CascadeBox {
  readonly width: number;
  readonly height: number;
}

export interface CascadePositionOptions {
  readonly columns?: number;
  readonly originX?: number;
  readonly originY?: number;
  readonly gapX?: number;
  readonly gapY?: number;
}

export function cascadePosition(
  cascadeIndex: number,
  box: CascadeBox,
  options: CascadePositionOptions = {},
): NodePosition {
  const {
    columns = 2,
    originX = 60,
    originY = 60,
    gapX = 40,
    gapY = 40,
  } = options;
  const col = cascadeIndex % columns;
  const row = Math.floor(cascadeIndex / columns);
  const stepX = box.width + gapX;
  const stepY = box.height + gapY;
  return { x: originX + col * stepX, y: originY + row * stepY };
}

export function cascadeBoxForAction(action: InspectorCreateAction): CascadeBox {
  switch (action.elementKind) {
    case 'PartDefinition':
      return { width: BDD_BLOCK_WIDTH, height: BDD_BLOCK_HEIGHT };
    case 'Requirement':
      return { width: REQUIREMENT_NODE_WIDTH, height: REQUIREMENT_NODE_HEIGHT };
    case 'ActionUsage': {
      const raw = action.defaultData?.['nodeType'];
      const nodeType: ActionNodeType = isActionNodeType(raw) ? raw : 'action';
      return actionNodeSize(nodeType);
    }
    case 'StateUsage': {
      const raw = action.defaultData?.['stateType'];
      const stateType: StateNodeType = isStateNodeType(raw) ? raw : 'state';
      return stateNodeSize(stateType);
    }
    case 'Actor':
      return { width: USE_CASE_ACTOR_WIDTH, height: USE_CASE_ACTOR_HEIGHT };
    case 'UseCase':
      return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
    case 'ConstraintUsage':
      return {
        width: PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
        height: PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
      };
    case 'ValueProperty':
      return {
        width: PARAMETRIC_VALUE_PROPERTY_WIDTH,
        height: PARAMETRIC_VALUE_PROPERTY_HEIGHT,
      };
    case 'Package':
      return { width: PACKAGE_NODE_WIDTH, height: PACKAGE_NODE_HEIGHT };
    case 'PartUsage':
      return { width: IBD_PART_USAGE_WIDTH, height: IBD_PART_USAGE_HEIGHT };
    default:
      // Sentinel — unreachable for actions returned by inspectorCreatePanel,
      // but keep a safe fallback so future palette additions don't NaN the
      // cascade math while the dispatcher catches up.
      return { width: ACTIVITY_ACTION_WIDTH, height: ACTIVITY_ACTION_HEIGHT };
  }
}

export interface InspectorCreateStoreActions {
  createBlock(position?: NodePosition): ElementId | null;
  createRequirement(
    diagramId: DiagramId,
    position: NodePosition,
  ): ElementId | null;
  createActionUsage(
    diagramId: DiagramId,
    position: NodePosition,
    nodeType: ActionNodeType,
  ): ElementId | null;
  createStateUsage(
    diagramId: DiagramId,
    position: NodePosition,
    stateType: StateNodeType,
  ): ElementId | null;
  createActor(diagramId: DiagramId, position: NodePosition): ElementId | null;
  createUseCase(diagramId: DiagramId, position: NodePosition): ElementId | null;
  createConstraintUsage(
    diagramId: DiagramId,
    position: NodePosition,
  ): ElementId | null;
  createValueProperty(
    diagramId: DiagramId,
    position: NodePosition,
  ): ElementId | null;
  createPackage(
    diagramId: DiagramId,
    position: NodePosition,
  ): ElementId | null;
}

export interface DispatchInspectorCreateInput {
  readonly action: InspectorCreateAction;
  readonly diagram: Pick<Diagram, 'id' | 'positions'>;
}

export function dispatchInspectorCreate(
  input: DispatchInspectorCreateInput,
  store: InspectorCreateStoreActions,
): ElementId | null {
  const { action, diagram } = input;
  const cascadeIndex = Object.keys(diagram.positions).length;
  const position = cascadePosition(
    cascadeIndex,
    cascadeBoxForAction(action),
  );
  switch (action.elementKind) {
    case 'PartDefinition':
      return store.createBlock(position);
    case 'Requirement':
      return store.createRequirement(diagram.id, position);
    case 'ActionUsage': {
      const raw = action.defaultData?.['nodeType'];
      const nodeType: ActionNodeType = isActionNodeType(raw) ? raw : 'action';
      return store.createActionUsage(diagram.id, position, nodeType);
    }
    case 'StateUsage': {
      const raw = action.defaultData?.['stateType'];
      const stateType: StateNodeType = isStateNodeType(raw) ? raw : 'state';
      return store.createStateUsage(diagram.id, position, stateType);
    }
    case 'Actor':
      return store.createActor(diagram.id, position);
    case 'UseCase':
      return store.createUseCase(diagram.id, position);
    case 'ConstraintUsage':
      return store.createConstraintUsage(diagram.id, position);
    case 'ValueProperty':
      return store.createValueProperty(diagram.id, position);
    case 'Package':
      return store.createPackage(diagram.id, position);
    default:
      return null;
  }
}
