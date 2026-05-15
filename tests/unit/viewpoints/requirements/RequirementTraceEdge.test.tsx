import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { EdgeProps, Position } from '@xyflow/react';

import type { EdgeId, RequirementTraceKind } from '@/model';
import {
  RequirementTraceEdge,
  type RequirementTraceFlowEdge,
} from '@/viewpoints/requirements/RequirementTraceEdge';

import { mkEdgeId } from '../../model/helpers';

function renderEdge(
  traceKind: RequirementTraceKind,
  options: { label?: string; selected?: boolean; id?: EdgeId } = {},
) {
  const id = options.id ?? mkEdgeId('e1');
  const props = {
    id,
    source: 'r1',
    target: 'r2',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: 'bottom' as Position,
    targetPosition: 'top' as Position,
    selected: options.selected ?? false,
    animated: false,
    data: { edgeId: id, traceKind, label: options.label },
  } as unknown as EdgeProps<RequirementTraceFlowEdge>;
  return render(
    <ReactFlowProvider>
      <svg>
        <RequirementTraceEdge {...props} />
      </svg>
    </ReactFlowProvider>,
  );
}

function pathFor(container: HTMLElement): SVGPathElement {
  const path = container.querySelector('path[marker-end]') as SVGPathElement | null;
  if (!path) throw new Error('expected to find the trace edge path');
  return path;
}

describe('RequirementTraceEdge', () => {
  it('stamps data-trace-kind for the rendered kind', () => {
    const kinds: readonly RequirementTraceKind[] = [
      'derive',
      'satisfy',
      'verify',
      'refine',
    ];
    for (const kind of kinds) {
      const { container, unmount } = renderEdge(kind);
      const g = container.querySelector(`[data-trace-kind="${kind}"]`);
      expect(g).not.toBeNull();
      unmount();
    }
  });

  it('uses dashed strokes for every trace kind (SysML 1.6 §9.1.4.5)', () => {
    function dashOf(kind: RequirementTraceKind): string {
      const { container, unmount } = renderEdge(kind);
      const path = pathFor(container);
      const inlineDash = path.style.strokeDasharray ?? '';
      const dashAttr = path.getAttribute('stroke-dasharray') ?? '';
      const result = inlineDash || dashAttr;
      unmount();
      return result;
    }
    expect(dashOf('derive')).toMatch(/6/);
    expect(dashOf('refine')).toMatch(/6/);
    expect(dashOf('satisfy')).toMatch(/6/);
    expect(dashOf('verify')).toMatch(/6/);
  });

  it('points the markerEnd at a per-edge SVG marker', () => {
    const id = mkEdgeId('e-marker');
    const { container } = renderEdge('satisfy', { id });
    const marker = container.querySelector(`marker#req-trace-${id}`);
    expect(marker).not.toBeNull();
    const path = pathFor(container);
    expect(path.getAttribute('marker-end')).toContain(`req-trace-${id}`);
  });

  it('renders an inner <path> for every kind (smoke check)', () => {
    for (const kind of ['derive', 'satisfy', 'verify', 'refine'] as const) {
      const { container, unmount } = renderEdge(kind);
      expect(pathFor(container)).toBeDefined();
      unmount();
    }
  });
});
