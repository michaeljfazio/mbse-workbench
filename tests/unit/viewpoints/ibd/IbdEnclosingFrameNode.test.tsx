import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';

import {
  IbdEnclosingFrameNode,
  type IbdEnclosingFrameNodeType,
} from '@/viewpoints/ibd/IbdEnclosingFrameNode';

import { mkElementId } from '../../model/helpers';

function renderFrame(name: string) {
  const partDefinitionId = mkElementId('def-pump');
  const data = { partDefinitionId, name };
  const full = {
    id: 'frame-def-pump',
    type: 'ibd-enclosing-frame',
    data,
    selected: false,
    dragging: false,
    draggable: false,
    selectable: false,
    deletable: false,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: -1,
  } as unknown as NodeProps<IbdEnclosingFrameNodeType>;
  return render(
    <ReactFlowProvider>
      <IbdEnclosingFrameNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('IbdEnclosingFrameNode (T-13.20)', () => {
  it('renders the PartDefinition name inside the frame header', () => {
    const { container } = renderFrame('Pump');
    const name = container.querySelector(
      '[data-testid="ibd-enclosing-frame-name-def-pump"]',
    );
    expect(name).not.toBeNull();
    expect(name!.textContent).toBe('Pump');
  });

  it('exposes a stable testid keyed off the part-definition id', () => {
    const { container } = renderFrame('Pump');
    expect(
      container.querySelector('[data-testid="ibd-enclosing-frame-def-pump"]'),
    ).not.toBeNull();
  });

  it('shows the SysMLv2 «block» stereotype label in the header', () => {
    const { container } = renderFrame('Pump');
    const root = container.querySelector(
      '[data-testid="ibd-enclosing-frame-def-pump"]',
    );
    expect(root).not.toBeNull();
    // « / » are the « » guillemets.
    expect(root!.textContent).toContain('«block»');
  });

  it('does not receive pointer events (frame is a passive backdrop)', () => {
    const { container } = renderFrame('Pump');
    const root = container.querySelector(
      '[data-testid="ibd-enclosing-frame-def-pump"]',
    );
    expect(root!.className).toMatch(/pointer-events-none/);
  });
});
