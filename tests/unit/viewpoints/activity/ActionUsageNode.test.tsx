import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import type { ActionNodeType, ElementId } from '@/model';
import {
  ActionUsageNode,
  isRenamablePseudostate,
  type ActionRenameCallback,
  type ActionUsageFlowNode,
} from '@/viewpoints/activity/ActionUsageNode';

import { mkElementId } from '../../model/helpers';

function renderActionNode(
  data: { elementId: ElementId; name: string; nodeType: ActionNodeType },
  onRename: ActionRenameCallback,
  overrides: Partial<NodeProps<ActionUsageFlowNode>> = {},
) {
  const full = {
    id: data.elementId,
    type: `activity-${data.nodeType}`,
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
  } as unknown as NodeProps<ActionUsageFlowNode>;
  return render(
    <ReactFlowProvider>
      <ActionUsageNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('ActionUsageNode', () => {
  let onRename: ReturnType<typeof vi.fn>;
  const elementId = mkElementId('a1');

  beforeEach(() => {
    onRename = vi.fn();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders an Action node with the name centered and two handles', () => {
    const { container } = renderActionNode(
      { elementId, name: 'Heat water', nodeType: 'action' },
      onRename,
    );
    expect(screen.getByTestId(`activity-action-${elementId}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`activity-action-label-${elementId}`),
    ).toHaveTextContent('Heat water');
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('Action node: double-click + Enter commits rename via onRename', () => {
    renderActionNode(
      { elementId, name: 'Heat water', nodeType: 'action' },
      onRename,
    );
    fireEvent.doubleClick(
      screen.getByTestId(`activity-action-label-${elementId}`),
    );
    const input = screen.getByTestId(`activity-action-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Boil water' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(elementId, 'Boil water');
  });

  it('Decision node: renders a diamond with a renamable label', () => {
    renderActionNode(
      { elementId, name: 'Hot enough?', nodeType: 'decision' },
      onRename,
    );
    expect(
      screen.getByTestId(`activity-decision-${elementId}`),
    ).toBeInTheDocument();
    fireEvent.doubleClick(
      screen.getByTestId(`activity-decision-label-${elementId}`),
    );
    const input = screen.getByTestId(`activity-decision-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Bubbling?' } });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith(elementId, 'Bubbling?');
  });

  it('Merge node: visually identical to decision, also renamable', () => {
    renderActionNode(
      { elementId, name: 'Resume flow', nodeType: 'merge' },
      onRename,
    );
    expect(
      screen.getByTestId(`activity-merge-${elementId}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`activity-merge-label-${elementId}`),
    ).toHaveTextContent('Resume flow');
  });

  it('Initial node: renders a filled circle with no name and only a source handle', () => {
    const { container } = renderActionNode(
      { elementId, name: '', nodeType: 'initial' },
      onRename,
    );
    expect(
      screen.getByTestId(`activity-initial-${elementId}`),
    ).toBeInTheDocument();
    // Initial pseudostates are not renamable — no inline-rename test ids exist.
    expect(
      screen.queryByTestId(`activity-initial-label-${elementId}`),
    ).toBeNull();
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles).toHaveLength(1);
  });

  it('Final node: renders a bull’s-eye with only a target handle', () => {
    const { container } = renderActionNode(
      { elementId, name: '', nodeType: 'final' },
      onRename,
    );
    expect(
      screen.getByTestId(`activity-final-${elementId}`),
    ).toBeInTheDocument();
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles).toHaveLength(1);
  });

  it('Fork/Join nodes: render a horizontal bar with both handles', () => {
    const { container: forkContainer } = renderActionNode(
      { elementId, name: '', nodeType: 'fork' },
      onRename,
    );
    expect(
      forkContainer.querySelector(`[data-testid="activity-fork-${elementId}"]`),
    ).not.toBeNull();
    expect(
      forkContainer.querySelectorAll('.react-flow__handle').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('isRenamablePseudostate flags only initial/final as non-renamable', () => {
    expect(isRenamablePseudostate('action')).toBe(true);
    expect(isRenamablePseudostate('decision')).toBe(true);
    expect(isRenamablePseudostate('merge')).toBe(true);
    expect(isRenamablePseudostate('fork')).toBe(true);
    expect(isRenamablePseudostate('join')).toBe(true);
    expect(isRenamablePseudostate('initial')).toBe(false);
    expect(isRenamablePseudostate('final')).toBe(false);
  });
});
