import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import type { ElementId, PortDirection } from '@/model';
import {
  PartUsageNode,
  type IbdPartUsageNode,
  type IbdPartHandleSpec,
} from '@/viewpoints/ibd/PartUsageNode';

import { mkElementId } from '../../model/helpers';

function renderPart(ports: readonly IbdPartHandleSpec[]) {
  const data = {
    elementId: mkElementId('p1'),
    name: 'Pump',
    definitionName: 'PumpDef',
    ports,
  };
  const full = {
    id: data.elementId,
    type: 'ibd-part-usage',
    data,
    selected: false,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
  } as unknown as NodeProps<IbdPartUsageNode>;
  return render(
    <ReactFlowProvider>
      <PartUsageNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('PartUsageNode — square ports (T-13.17)', () => {
  it('renders port handles with square geometry (no rounded-full)', () => {
    const port: IbdPartHandleSpec = {
      portUsageId: 'pu1' as ElementId,
      portDefinitionId: 'pd1' as ElementId,
      label: 'in',
      direction: 'in' as PortDirection,
    };
    const { container } = renderPart([port]);
    const handle = container.querySelector('[data-testid="ibd-handle-pu1"]');
    expect(handle).not.toBeNull();
    // SysMLv2 ports are squares on the parent boundary, not circles.
    expect(handle!.className).toMatch(/!rounded-none/);
    expect(handle!.className).not.toMatch(/!rounded-full/);
  });
});

describe('PartUsageNode — direction glyphs (T-13.18)', () => {
  function port(direction: PortDirection, label = 'p'): IbdPartHandleSpec {
    return {
      portUsageId: 'pu1' as ElementId,
      portDefinitionId: 'pd1' as ElementId,
      label,
      direction,
    };
  }

  it('renders an inbound-pointing glyph for an in port on the left edge', () => {
    // A single port lands on the left side per placeHandle(0,1).
    const { container } = renderPart([port('in', 'fuel')]);
    const glyph = container.querySelector(
      '[data-testid="ibd-port-direction-pu1"]',
    );
    expect(glyph).not.toBeNull();
    expect(glyph!.textContent).toBe('▶');
  });

  it('renders an outbound-pointing glyph for an out port on the left edge', () => {
    const { container } = renderPart([port('out', 'power')]);
    const glyph = container.querySelector(
      '[data-testid="ibd-port-direction-pu1"]',
    );
    expect(glyph!.textContent).toBe('◀');
  });

  it('renders a bidirectional glyph for an inout port', () => {
    const { container } = renderPart([port('inout', 'signal')]);
    const glyph = container.querySelector(
      '[data-testid="ibd-port-direction-pu1"]',
    );
    expect(glyph!.textContent).toBe('↔');
  });

  it('flips the glyph orientation for a port that lands on the right edge', () => {
    // Two ports → port[0] left, port[1] right per placeHandle alternation.
    const ports: IbdPartHandleSpec[] = [
      {
        portUsageId: 'pu-l' as ElementId,
        portDefinitionId: 'pd-l' as ElementId,
        label: 'left',
        direction: 'in',
      },
      {
        portUsageId: 'pu-r' as ElementId,
        portDefinitionId: 'pd-r' as ElementId,
        label: 'right',
        direction: 'in',
      },
    ];
    const { container } = renderPart(ports);
    const left = container.querySelector(
      '[data-testid="ibd-port-direction-pu-l"]',
    );
    const right = container.querySelector(
      '[data-testid="ibd-port-direction-pu-r"]',
    );
    // Both are 'in' (into the body) but on opposite edges, so they point
    // toward each other across the part.
    expect(left!.textContent).toBe('▶');
    expect(right!.textContent).toBe('◀');
  });

  it('orders glyph closest to the part body on each side', () => {
    const ports: IbdPartHandleSpec[] = [
      {
        portUsageId: 'pu-l' as ElementId,
        portDefinitionId: 'pd-l' as ElementId,
        label: 'fuel',
        direction: 'in',
      },
      {
        portUsageId: 'pu-r' as ElementId,
        portDefinitionId: 'pd-r' as ElementId,
        label: 'power',
        direction: 'out',
      },
    ];
    const { container } = renderPart(ports);
    const leftRow = container.querySelector('[data-testid="ibd-port-pu-l"]');
    const rightRow = container.querySelector('[data-testid="ibd-port-pu-r"]');
    // Left-side row: label first, glyph second (glyph hugs the body).
    expect(leftRow!.children[0]!.getAttribute('data-testid')).toBe(
      'ibd-port-label-pu-l',
    );
    expect(leftRow!.children[1]!.getAttribute('data-testid')).toBe(
      'ibd-port-direction-pu-l',
    );
    // Right-side row: glyph first, label second.
    expect(rightRow!.children[0]!.getAttribute('data-testid')).toBe(
      'ibd-port-direction-pu-r',
    );
    expect(rightRow!.children[1]!.getAttribute('data-testid')).toBe(
      'ibd-port-label-pu-r',
    );
  });

  it('marks the glyph aria-hidden so screen readers do not announce it', () => {
    const { container } = renderPart([port('in', 'fuel')]);
    const glyph = container.querySelector(
      '[data-testid="ibd-port-direction-pu1"]',
    );
    expect(glyph!.getAttribute('aria-hidden')).toBe('true');
  });
});
