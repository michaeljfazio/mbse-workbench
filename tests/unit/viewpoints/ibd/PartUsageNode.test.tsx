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
