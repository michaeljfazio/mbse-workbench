import type { ModelEdge, ModelElement } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import {
  ConstraintUsageNode,
  PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE,
} from './ConstraintUsageNode';
import {
  PARAMETRIC_PARAMETER_BINDING_EDGE_TYPE,
  ParameterBindingEdge,
} from './ParameterBindingEdge';
import {
  PARAMETRIC_VALUE_PROPERTY_NODE_TYPE,
  ValuePropertyNode,
} from './ValuePropertyNode';
import {
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
} from './sizes';

export {
  ConstraintUsageNode,
  PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE,
} from './ConstraintUsageNode';
export type {
  ConstraintUsageFlowNode,
  ConstraintUsageNodeData,
  ConstraintUsageRenameCallback,
} from './ConstraintUsageNode';
export {
  formatValueDefault,
  PARAMETRIC_VALUE_PROPERTY_NODE_TYPE,
  ValuePropertyNode,
} from './ValuePropertyNode';
export type {
  ValuePropertyFlowNode,
  ValuePropertyNodeData,
  ValuePropertyRenameCallback,
} from './ValuePropertyNode';
export {
  PARAMETRIC_PARAMETER_BINDING_EDGE_TYPE,
  ParameterBindingEdge,
} from './ParameterBindingEdge';
export type {
  ParameterBindingEdgeData,
  ParameterBindingFlowEdge,
} from './ParameterBindingEdge';
export {
  canonicalizeParametricConnection,
  isValidParametricConnection,
} from './isValidConnection';
export {
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
} from './sizes';

export const PARAMETRIC_VIEWPOINT_ID: ViewpointId = 'parametric';

// Kept for backwards-compatibility with the #135 placeholder. Callers that
// don't pass an element default to the ConstraintUsage box (slightly larger
// of the two), preserving prior layout behaviour.
export const PARAMETRIC_DEFAULT_NODE_WIDTH = PARAMETRIC_CONSTRAINT_USAGE_WIDTH;
export const PARAMETRIC_DEFAULT_NODE_HEIGHT = PARAMETRIC_CONSTRAINT_USAGE_HEIGHT;

const PARAMETRIC_PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    elementKind: 'ConstraintUsage',
    label: 'Constraint',
    description: 'A constraint usage that holds an equation between parameters.',
  },
  {
    elementKind: 'ValueProperty',
    label: 'Value',
    description: 'A typed value property that participates in constraints.',
  },
];

// Module-scoped (frozen) so React Flow gets stable references.
const PARAMETRIC_NODE_TYPES = Object.freeze({
  [PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE]: ConstraintUsageNode,
  [PARAMETRIC_VALUE_PROPERTY_NODE_TYPE]: ValuePropertyNode,
}) as unknown as ViewpointNodeTypes;
const PARAMETRIC_EDGE_TYPES = Object.freeze({
  [PARAMETRIC_PARAMETER_BINDING_EDGE_TYPE]: ParameterBindingEdge,
}) as unknown as ViewpointEdgeTypes;

export const parametricViewpoint: Viewpoint = {
  id: PARAMETRIC_VIEWPOINT_ID,
  label: 'Parametric Diagram',
  acceptedElementKinds: ['ConstraintUsage', 'ValueProperty'],
  acceptedEdgeKinds: ['ParameterBinding'],
  // Per ADR 0008 § 2: ParameterBinding stays in ModelEdge — not an
  // element-as-edge — because it carries no identity beyond endpoints.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: PARAMETRIC_PALETTE_ITEMS,
  nodeTypes: PARAMETRIC_NODE_TYPES,
  edgeTypes: PARAMETRIC_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'ConstraintUsage') {
      return PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE;
    }
    if (element.kind === 'ValueProperty') {
      return PARAMETRIC_VALUE_PROPERTY_NODE_TYPE;
    }
    throw new Error(
      `parametric viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    if (edge.kind === 'ParameterBinding') {
      return PARAMETRIC_PARAMETER_BINDING_EDGE_TYPE;
    }
    throw new Error(
      `parametric viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `parametric viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(
    element: ModelElement,
  ): { readonly width: number; readonly height: number } {
    if (element.kind === 'ValueProperty') {
      return {
        width: PARAMETRIC_VALUE_PROPERTY_WIDTH,
        height: PARAMETRIC_VALUE_PROPERTY_HEIGHT,
      };
    }
    return {
      width: PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
      height: PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
    };
  },
};
