import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import type { ElementId, StateNodeType } from '@/model';
import {
  StateUsageNode,
  type StateRenameCallback,
  type StateUsageFlowNode,
} from '@/viewpoints/stateMachine/StateUsageNode';

import { mkElementId } from '../../model/helpers';

function renderStateNode(
  data: {
    elementId: ElementId;
    name: string;
    stateType: StateNodeType;
    entryAction?: string;
    exitAction?: string;
    doAction?: string;
  },
  onRename: StateRenameCallback,
  overrides: Partial<NodeProps<StateUsageFlowNode>> = {},
) {
  const full = {
    id: data.elementId,
    type: `state-machine-${data.stateType}`,
    data: {
      elementId: data.elementId,
      name: data.name,
      stateType: data.stateType,
      entryAction: data.entryAction,
      exitAction: data.exitAction,
      doAction: data.doAction,
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
  } as unknown as NodeProps<StateUsageFlowNode>;
  return render(
    <ReactFlowProvider>
      <StateUsageNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('StateUsageNode', () => {
  let onRename: ReturnType<typeof vi.fn>;
  const elementId = mkElementId('s1');

  beforeEach(() => {
    onRename = vi.fn();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a State node with the name centered and four handles', () => {
    const { container } = renderStateNode(
      { elementId, name: 'Idle', stateType: 'state' },
      onRename,
    );
    expect(screen.getByTestId(`state-machine-state-${elementId}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`state-machine-state-label-${elementId}`),
    ).toHaveTextContent('Idle');
    const handles = container.querySelectorAll('.react-flow__handle');
    // top target, left target, right source, bottom source
    expect(handles.length).toBeGreaterThanOrEqual(4);
  });

  it('State node: double-click + Enter commits rename via onRename', () => {
    renderStateNode(
      { elementId, name: 'Idle', stateType: 'state' },
      onRename,
    );
    fireEvent.doubleClick(
      screen.getByTestId(`state-machine-state-label-${elementId}`),
    );
    const input = screen.getByTestId(`state-machine-state-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Running' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(elementId, 'Running');
  });

  it('State node: renders entry/do/exit action rows when provided', () => {
    renderStateNode(
      {
        elementId,
        name: 'Idle',
        stateType: 'state',
        entryAction: 'log("hi")',
        doAction: 'tick()',
        exitAction: 'log("bye")',
      },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-state-actions-${elementId}`),
    ).toBeInTheDocument();
  });

  it('Initial pseudostate: renders a filled circle with only a source handle', () => {
    const { container } = renderStateNode(
      { elementId, name: '', stateType: 'initial' },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-initial-${elementId}`),
    ).toBeInTheDocument();
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles).toHaveLength(1);
  });

  it('Final pseudostate: renders a bullseye with only a target handle', () => {
    const { container } = renderStateNode(
      { elementId, name: '', stateType: 'final' },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-final-${elementId}`),
    ).toBeInTheDocument();
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles).toHaveLength(1);
  });

  it('Final pseudostate: outer + inner concentric disks are both rounded-full', () => {
    renderStateNode(
      { elementId, name: '', stateType: 'final' },
      onRename,
    );
    const outer = screen.getByTestId(`state-machine-final-${elementId}`);
    expect(outer.className).toMatch(/rounded-full/);
    const inner = outer.querySelector('span[aria-hidden="true"]');
    expect(inner).not.toBeNull();
    expect(inner?.className).toMatch(/rounded-full/);
    expect(inner?.className).toMatch(/bg-foreground/);
  });

  it('exposes data-pseudostate-shape="circle-filled" on Initial', () => {
    renderStateNode(
      { elementId, name: '', stateType: 'initial' },
      onRename,
    );
    const node = screen.getByTestId(`state-machine-initial-${elementId}`);
    expect(node.getAttribute('data-pseudostate-shape')).toBe('circle-filled');
  });

  it('exposes data-pseudostate-shape="bullseye" on Final', () => {
    renderStateNode(
      { elementId, name: '', stateType: 'final' },
      onRename,
    );
    const node = screen.getByTestId(`state-machine-final-${elementId}`);
    expect(node.getAttribute('data-pseudostate-shape')).toBe('bullseye');
  });

  it('preserves the existing data-state-node-type marker on every shape', () => {
    const { unmount: u1 } = renderStateNode(
      { elementId, name: 'Idle', stateType: 'state' },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-state-${elementId}`).getAttribute('data-state-node-type'),
    ).toBe('state');
    u1();
    const { unmount: u2 } = renderStateNode(
      { elementId, name: '', stateType: 'initial' },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-initial-${elementId}`).getAttribute('data-state-node-type'),
    ).toBe('initial');
    u2();
    renderStateNode(
      { elementId, name: '', stateType: 'final' },
      onRename,
    );
    expect(
      screen.getByTestId(`state-machine-final-${elementId}`).getAttribute('data-state-node-type'),
    ).toBe('final');
  });
});
