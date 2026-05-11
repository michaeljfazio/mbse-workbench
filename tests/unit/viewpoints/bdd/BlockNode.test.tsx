import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';
import {
  BlockNode,
  type BddBlockNode,
  type BlockRenameCallback,
} from '@/viewpoints/bdd/BlockNode';

import { mkElementId } from '../../model/helpers';

// Renders a BlockNode by passing only the props it reads. React Flow normally
// wraps custom nodes with its own Provider; the BlockNode itself doesn't
// touch any React Flow hooks except <Handle>, which needs a provider context.
function renderBlock(
  data: { elementId: ElementId; name: string },
  onRename: BlockRenameCallback,
  overrides: Partial<NodeProps<BddBlockNode>> = {},
) {
  const full = {
    id: data.elementId,
    type: 'bdd-block',
    data: { ...data, onRename },
    selected: false,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    ...overrides,
  } as unknown as NodeProps<BddBlockNode>;
  return render(
    <ReactFlowProvider>
      <BlockNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('BlockNode', () => {
  let onRename: ReturnType<typeof vi.fn>;
  const elementId = mkElementId('b1');

  beforeEach(() => {
    onRename = vi.fn();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the stereotype, the block name, and two handles', () => {
    const { container } = renderBlock(
      { elementId, name: 'A Block' },
      onRename,
    );
    expect(screen.getByText(/«block»/)).toBeInTheDocument();
    expect(screen.getByTestId(`bdd-block-label-${elementId}`)).toHaveTextContent(
      'A Block',
    );
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the selected ring when selected is true', () => {
    renderBlock({ elementId, name: 'A Block' }, onRename, { selected: true });
    const block = screen.getByTestId(`bdd-block-${elementId}`);
    expect(block.className).toMatch(/border-primary/);
  });

  it('double-clicking the label enters edit mode and Enter commits via onRename', () => {
    renderBlock({ elementId, name: 'Block 1' }, onRename);

    fireEvent.doubleClick(screen.getByTestId(`bdd-block-label-${elementId}`));
    const input = screen.getByTestId(`bdd-block-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Renamed Block' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith(elementId, 'Renamed Block');
  });

  it('Escape during edit mode discards the draft and does NOT call onRename', () => {
    renderBlock({ elementId, name: 'Block 1' }, onRename);

    fireEvent.doubleClick(screen.getByTestId(`bdd-block-label-${elementId}`));
    const input = screen.getByTestId(`bdd-block-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Different' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onRename).not.toHaveBeenCalled();
  });

  it('an empty (whitespace) rename is rejected', () => {
    renderBlock({ elementId, name: 'Block 1' }, onRename);

    fireEvent.doubleClick(screen.getByTestId(`bdd-block-label-${elementId}`));
    const input = screen.getByTestId(`bdd-block-input-${elementId}`);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).not.toHaveBeenCalled();
  });

  it('blur commits the rename (same path as Enter)', () => {
    renderBlock({ elementId, name: 'Block 1' }, onRename);

    fireEvent.doubleClick(screen.getByTestId(`bdd-block-label-${elementId}`));
    const input = screen.getByTestId(`bdd-block-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'After Blur' } });
    fireEvent.blur(input);

    expect(onRename).toHaveBeenCalledWith(elementId, 'After Blur');
  });
});
