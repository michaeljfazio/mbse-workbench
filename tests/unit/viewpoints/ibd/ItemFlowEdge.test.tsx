import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { EdgeProps, Position } from '@xyflow/react';

import type { ElementId } from '@/model';
import {
  ItemFlowEdge,
  type IbdItemFlowEdge,
} from '@/viewpoints/ibd/ItemFlowEdge';

function renderEdge(
  options: {
    name?: string;
    itemType?: string;
    selected?: boolean;
    id?: string;
  } = {},
) {
  const id = options.id ?? 'e-itemflow-1';
  const props = {
    id,
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: 'right' as Position,
    targetPosition: 'left' as Position,
    selected: options.selected ?? false,
    animated: false,
    data: {
      elementId: 'if-1' as ElementId,
      name: options.name ?? '',
      itemType: options.itemType,
    },
  } as unknown as EdgeProps<IbdItemFlowEdge>;
  return render(
    <ReactFlowProvider>
      <svg>
        <ItemFlowEdge {...props} />
      </svg>
    </ReactFlowProvider>,
  );
}

function pathFor(container: HTMLElement): SVGPathElement {
  const path = container.querySelector('path[marker-end]') as SVGPathElement | null;
  if (!path) throw new Error('expected to find the item-flow edge path');
  return path;
}

describe('ItemFlowEdge', () => {
  it('renders a solid line (SysML 1.6 §17.6.1 — no stroke-dasharray)', () => {
    const { container } = renderEdge();
    const path = pathFor(container);
    const inlineDash = path.style.strokeDasharray ?? '';
    const dashAttr = path.getAttribute('stroke-dasharray') ?? '';
    expect(inlineDash).toBe('');
    expect(dashAttr).toBe('');
  });

  it('renders a filled triangular arrowhead via per-edge marker', () => {
    const id = 'e-itemflow-marker';
    const { container } = renderEdge({ id });
    const marker = container.querySelector(`marker#ibd-itemflow-arrow-${id}`);
    expect(marker).not.toBeNull();
    const markerPath = marker!.querySelector('path');
    expect(markerPath).not.toBeNull();
    // SysML convention: filled (not hollow) triangle.
    expect(markerPath!.getAttribute('fill')).toMatch(/hsl\(var\(--/);
    expect(markerPath!.getAttribute('stroke')).toBeNull();
    const path = pathFor(container);
    expect(path.getAttribute('marker-end')).toContain(`ibd-itemflow-arrow-${id}`);
  });

  it('uses the selected stroke colour when selected', () => {
    const { container } = renderEdge({ selected: true });
    const path = pathFor(container);
    const style = path.getAttribute('style') ?? '';
    expect(style).toMatch(/hsl\(var\(--primary\)\)/);
  });

  it('stamps the data-edge-kind="ItemFlow" marker on the wrapping group', () => {
    const { container } = renderEdge();
    const group = container.querySelector('[data-edge-kind="ItemFlow"]');
    expect(group).not.toBeNull();
  });
});
