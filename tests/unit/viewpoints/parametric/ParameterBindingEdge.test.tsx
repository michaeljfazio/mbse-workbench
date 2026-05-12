import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { EdgeProps, Position } from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  ParameterBindingEdge,
  type ParameterBindingFlowEdge,
} from '@/viewpoints/parametric/ParameterBindingEdge';

import { mkEdgeId } from '../../model/helpers';

function renderEdge(
  options: { label?: string; selected?: boolean; id?: EdgeId } = {},
) {
  const id = options.id ?? mkEdgeId('e1');
  const props = {
    id,
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: 'bottom' as Position,
    targetPosition: 'top' as Position,
    selected: options.selected ?? false,
    animated: false,
    data: { edgeId: id, label: options.label },
  } as unknown as EdgeProps<ParameterBindingFlowEdge>;
  return render(
    <ReactFlowProvider>
      <svg>
        <ParameterBindingEdge {...props} />
      </svg>
    </ReactFlowProvider>,
  );
}

describe('ParameterBindingEdge', () => {
  it('renders a solid path with binding-dot markers on both ends', () => {
    const { container } = renderEdge();
    const path = container.querySelector('path[marker-end]') as SVGPathElement | null;
    expect(path).not.toBeNull();
    expect(path!.getAttribute('marker-start')).toMatch(/parametric-binding-start-/);
    expect(path!.getAttribute('marker-end')).toMatch(/parametric-binding-end-/);
    // Solid line — no dasharray.
    const style = path!.getAttribute('style') ?? '';
    expect(style).not.toMatch(/stroke-dasharray/);
    // Marker glyphs are filled circles, not arrowheads.
    const circles = container.querySelectorAll('marker circle');
    expect(circles.length).toBe(2);
  });

  it('uses the selected stroke colour when selected', () => {
    const { container } = renderEdge({ selected: true });
    const path = container.querySelector('path[marker-end]') as SVGPathElement;
    const style = path.getAttribute('style') ?? '';
    expect(style).toMatch(/hsl\(var\(--primary\)\)/);
  });
});
