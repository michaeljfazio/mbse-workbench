import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import type {
  ElementId,
  RequirementPriority,
  RequirementStatus,
} from '@/model';
import {
  RequirementNode,
  type RequirementNodeType,
  type RequirementRenameCallback,
} from '@/viewpoints/requirements/RequirementNode';

import { mkElementId } from '../../model/helpers';

interface RequirementData {
  readonly elementId: ElementId;
  readonly name: string;
  readonly reqId: string | undefined;
  readonly text: string;
  readonly priority: RequirementPriority;
  readonly status: RequirementStatus;
}

function renderRequirement(
  data: RequirementData,
  onRename: RequirementRenameCallback,
  overrides: Partial<NodeProps<RequirementNodeType>> = {},
) {
  const full = {
    id: data.elementId,
    type: 'requirements-requirement',
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
  } as unknown as NodeProps<RequirementNodeType>;
  return render(
    <ReactFlowProvider>
      <RequirementNode {...full} />
    </ReactFlowProvider>,
  );
}

describe('RequirementNode', () => {
  let onRename: ReturnType<typeof vi.fn>;
  const elementId = mkElementId('r1');

  beforeEach(() => {
    onRename = vi.fn();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders reqId, name, text, priority badge, and status badge', () => {
    renderRequirement(
      {
        elementId,
        name: 'Stop on red',
        reqId: 'R-001',
        text: 'The system shall stop when a red signal is detected.',
        priority: 'high',
        status: 'approved',
      },
      onRename,
    );

    expect(
      screen.getByTestId(`requirements-req-id-${elementId}`),
    ).toHaveTextContent('R-001');
    expect(
      screen.getByTestId(`requirements-req-name-${elementId}`),
    ).toHaveTextContent('Stop on red');
    expect(
      screen.getByTestId(`requirements-req-text-${elementId}`),
    ).toHaveTextContent('The system shall stop when a red signal is detected.');
    expect(
      screen.getByTestId(`requirements-priority-${elementId}`),
    ).toHaveTextContent('high');
    expect(
      screen.getByTestId(`requirements-status-${elementId}`),
    ).toHaveTextContent('approved');
  });

  it('renders the «requirement» stereotype line above the name', () => {
    renderRequirement(
      {
        elementId,
        name: 'Stop on red',
        reqId: 'R-001',
        text: 'shall stop',
        priority: 'high',
        status: 'approved',
      },
      onRename,
    );
    const stereotype = screen.getByTestId(
      `requirements-req-stereotype-${elementId}`,
    );
    expect(stereotype).toHaveTextContent('«requirement»');
    // Stereotype appears before the name in DOM order.
    const name = screen.getByTestId(`requirements-req-name-${elementId}`);
    expect(
      stereotype.compareDocumentPosition(name) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders per-compartment labels (id / text / priority / status)', () => {
    renderRequirement(
      {
        elementId,
        name: 'X',
        reqId: 'R',
        text: 'y',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
    );
    expect(
      screen.getByTestId(`requirements-compartment-label-id-${elementId}`),
    ).toHaveTextContent(/^id$/i);
    expect(
      screen.getByTestId(`requirements-compartment-label-text-${elementId}`),
    ).toHaveTextContent(/^text$/i);
    expect(
      screen.getByTestId(
        `requirements-compartment-label-priority-${elementId}`,
      ),
    ).toHaveTextContent(/^priority$/i);
    expect(
      screen.getByTestId(`requirements-compartment-label-status-${elementId}`),
    ).toHaveTextContent(/^status$/i);
  });

  it('falls back to em-dash when reqId is undefined', () => {
    renderRequirement(
      {
        elementId,
        name: 'No id yet',
        reqId: undefined,
        text: '',
        priority: 'low',
        status: 'draft',
      },
      onRename,
    );
    expect(
      screen.getByTestId(`requirements-req-id-${elementId}`),
    ).toHaveTextContent('—');
  });

  it('shows placeholder text when the requirement text is empty', () => {
    renderRequirement(
      {
        elementId,
        name: 'Req',
        reqId: 'R-1',
        text: '',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
    );
    expect(
      screen.getByTestId(`requirements-req-text-${elementId}`),
    ).toHaveTextContent('No requirement text yet.');
  });

  it.each([
    ['low', 'bg-slate-100'],
    ['medium', 'bg-sky-100'],
    ['high', 'bg-amber-100'],
    ['critical', 'bg-rose-100'],
  ])('priority badge for %s uses the expected colour class', (priority, cls) => {
    renderRequirement(
      {
        elementId,
        name: 'Req',
        reqId: 'R',
        text: 'x',
        priority: priority as RequirementPriority,
        status: 'draft',
      },
      onRename,
    );
    expect(
      screen.getByTestId(`requirements-priority-${elementId}`).className,
    ).toMatch(new RegExp(cls));
  });

  it.each([
    ['draft', 'bg-slate-100'],
    ['approved', 'bg-emerald-100'],
    ['implemented', 'bg-sky-100'],
    ['verified', 'bg-violet-100'],
    ['rejected', 'bg-rose-100'],
  ])('status badge for %s uses the expected colour class', (status, cls) => {
    renderRequirement(
      {
        elementId,
        name: 'Req',
        reqId: 'R',
        text: 'x',
        priority: 'medium',
        status: status as RequirementStatus,
      },
      onRename,
    );
    expect(
      screen.getByTestId(`requirements-status-${elementId}`).className,
    ).toMatch(new RegExp(cls));
  });

  it('shows the selected ring when selected is true', () => {
    renderRequirement(
      {
        elementId,
        name: 'X',
        reqId: 'R',
        text: 'y',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
      { selected: true },
    );
    const card = screen.getByTestId(`requirements-req-${elementId}`);
    expect(card.className).toMatch(/border-primary/);
  });

  it('double-click the name enters edit mode; Enter commits via onRename', () => {
    renderRequirement(
      {
        elementId,
        name: 'Req1',
        reqId: 'R-001',
        text: '',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
    );
    fireEvent.doubleClick(
      screen.getByTestId(`requirements-req-name-${elementId}`),
    );
    const input = screen.getByTestId(`requirements-req-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Stop on red' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(elementId, 'Stop on red');
  });

  it('Escape during edit mode discards the draft', () => {
    renderRequirement(
      {
        elementId,
        name: 'Req1',
        reqId: 'R-001',
        text: '',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
    );
    fireEvent.doubleClick(
      screen.getByTestId(`requirements-req-name-${elementId}`),
    );
    const input = screen.getByTestId(`requirements-req-input-${elementId}`);
    fireEvent.change(input, { target: { value: 'Different' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
  });

  it('rejects empty / whitespace rename and falls back to the original name', () => {
    renderRequirement(
      {
        elementId,
        name: 'Req1',
        reqId: 'R-001',
        text: '',
        priority: 'medium',
        status: 'draft',
      },
      onRename,
    );
    fireEvent.doubleClick(
      screen.getByTestId(`requirements-req-name-${elementId}`),
    );
    const input = screen.getByTestId(`requirements-req-input-${elementId}`);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).not.toHaveBeenCalled();
  });
});
