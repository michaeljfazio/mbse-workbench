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
import {
  bddBlockEmptyCompartments,
  type BddBlockCompartments,
} from '@/viewpoints/bdd/blockCompartments';

import { mkElementId } from '../../model/helpers';

interface RenderProps {
  readonly elementId: ElementId;
  readonly name: string;
  readonly compartments?: BddBlockCompartments;
}

function renderBlock(
  data: RenderProps,
  onRename: BlockRenameCallback,
  overrides: Partial<NodeProps<BddBlockNode>> = {},
) {
  const full = {
    id: data.elementId,
    type: 'bdd-block',
    data: {
      elementId: data.elementId,
      name: data.name,
      compartments: data.compartments ?? bddBlockEmptyCompartments(),
      onRename,
    },
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
    expect(screen.getByTestId(`bdd-block-stereotype-${elementId}`)).toHaveTextContent(
      /«block»/,
    );
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

  it('renders all four compartments with their labels even when every one is empty', () => {
    renderBlock({ elementId, name: 'Empty Block' }, onRename);
    for (const kind of ['parts', 'ports', 'values', 'constraints'] as const) {
      expect(
        screen.getByTestId(`bdd-block-compartment-${kind}-${elementId}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`bdd-block-compartment-label-${kind}-${elementId}`),
      ).toHaveTextContent(kind);
      expect(
        screen.getByTestId(`bdd-block-compartment-empty-${kind}-${elementId}`),
      ).toHaveTextContent('—');
    }
  });

  it('renders compartment items with their formatted labels and stable testids', () => {
    const compartments: BddBlockCompartments = {
      parts: {
        items: [
          { id: mkElementId('pu-1'), label: 'pump : Pump' },
          { id: mkElementId('pu-2'), label: 'valve : Valve' },
        ],
        overflow: 0,
      },
      ports: {
        items: [{ id: mkElementId('po-1'), label: 'inlet : in' }],
        overflow: 0,
      },
      values: {
        items: [{ id: mkElementId('vp-1'), label: 'mass : number = 12.5' }],
        overflow: 0,
      },
      constraints: {
        items: [{ id: mkElementId('cu-1'), label: 'limit : mass < 10' }],
        overflow: 0,
      },
    };
    renderBlock(
      { elementId, name: 'Tank', compartments },
      onRename,
    );

    expect(
      screen.getByTestId('bdd-block-compartment-item-pu-1'),
    ).toHaveTextContent('pump : Pump');
    expect(
      screen.getByTestId('bdd-block-compartment-item-pu-2'),
    ).toHaveTextContent('valve : Valve');
    expect(
      screen.getByTestId('bdd-block-compartment-item-po-1'),
    ).toHaveTextContent('inlet : in');
    expect(
      screen.getByTestId('bdd-block-compartment-item-vp-1'),
    ).toHaveTextContent('mass : number = 12.5');
    expect(
      screen.getByTestId('bdd-block-compartment-item-cu-1'),
    ).toHaveTextContent('limit : mass < 10');
  });

  it('shows the overflow indicator when items exceed the visible cap', () => {
    const compartments: BddBlockCompartments = {
      ...bddBlockEmptyCompartments(),
      ports: {
        items: [
          { id: mkElementId('po-1'), label: 'p1 : in' },
          { id: mkElementId('po-2'), label: 'p2 : in' },
          { id: mkElementId('po-3'), label: 'p3 : in' },
        ],
        overflow: 2,
      },
    };
    renderBlock({ elementId, name: 'Tank', compartments }, onRename);

    expect(
      screen.getByTestId(`bdd-block-compartment-overflow-ports-${elementId}`),
    ).toHaveTextContent('+2 more');
  });

  it('does NOT show an empty marker for a non-empty compartment', () => {
    const compartments: BddBlockCompartments = {
      ...bddBlockEmptyCompartments(),
      ports: {
        items: [{ id: mkElementId('po-1'), label: 'p1 : in' }],
        overflow: 0,
      },
    };
    renderBlock({ elementId, name: 'Tank', compartments }, onRename);
    expect(
      screen.queryByTestId(`bdd-block-compartment-empty-ports-${elementId}`),
    ).toBeNull();
  });

  it('does NOT show the overflow indicator when overflow is zero', () => {
    const compartments: BddBlockCompartments = {
      ...bddBlockEmptyCompartments(),
      parts: {
        items: [{ id: mkElementId('pu-1'), label: 'pump : Pump' }],
        overflow: 0,
      },
    };
    renderBlock({ elementId, name: 'Tank', compartments }, onRename);
    expect(
      screen.queryByTestId(`bdd-block-compartment-overflow-parts-${elementId}`),
    ).toBeNull();
  });
});
