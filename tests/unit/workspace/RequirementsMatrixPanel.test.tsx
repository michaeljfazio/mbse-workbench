import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createElementId, type ElementId } from '@/model';
import { RequirementsMatrixPanel } from '@/workspace/RequirementsMatrixPanel';
import {
  cellKey,
  type TraceabilityCell,
  type TraceabilityColumn,
  type TraceabilityMatrix,
  type TraceabilityRow,
} from '@/workspace/requirements/matrix';

function row(reqId: string, name: string): TraceabilityRow {
  return {
    requirementId: createElementId(),
    reqId,
    name,
    priority: 'medium',
    status: 'approved',
    outgoingCount: 0,
  };
}

function col(name: string): TraceabilityColumn {
  return {
    elementId: createElementId(),
    kind: 'PartDefinition',
    name,
  };
}

function matrix(
  rows: readonly TraceabilityRow[],
  columns: readonly TraceabilityColumn[],
  cellInputs: readonly Pick<TraceabilityCell, 'requirementId' | 'elementId' | 'traceKinds'>[],
): TraceabilityMatrix {
  const cells = new Map<string, TraceabilityCell>();
  for (const c of cellInputs) {
    cells.set(cellKey(c.requirementId, c.elementId), {
      requirementId: c.requirementId,
      elementId: c.elementId,
      traceKinds: c.traceKinds,
      edgeIds: [],
    });
  }
  return { rows, columns, cells };
}

describe('RequirementsMatrixPanel', () => {
  it('renders empty state when no requirements are present', () => {
    render(
      <RequirementsMatrixPanel
        matrix={matrix([], [], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(screen.getByTestId('requirements-matrix-panel')).toBeTruthy();
    expect(screen.getByTestId('requirements-matrix-empty')).toBeTruthy();
  });

  it('renders requirement rows with reqId in the first column', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const r2 = row('REQ-2', 'Yield');
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1, r2], [], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(
      screen.getByTestId(`requirements-matrix-row-${r1.requirementId}`),
    ).toHaveTextContent('REQ-1');
    expect(
      screen.getByTestId(`requirements-matrix-row-${r2.requirementId}`),
    ).toHaveTextContent('REQ-2');
  });

  it('renders column headers from traced elements', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const c1 = col('Brake');
    const c2 = col('Pedal');
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1], [c1, c2], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(
      screen.getByTestId(`requirements-matrix-column-${c1.elementId}`),
    ).toHaveTextContent('Brake');
    expect(
      screen.getByTestId(`requirements-matrix-column-${c2.elementId}`),
    ).toHaveTextContent('Pedal');
  });

  it('renders glyphs for each trace kind in a cell', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const c1 = col('Brake');
    render(
      <RequirementsMatrixPanel
        matrix={matrix(
          [r1],
          [c1],
          [
            {
              requirementId: r1.requirementId,
              elementId: c1.elementId,
              traceKinds: ['satisfy', 'verify'],
            },
          ],
        )}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(
      screen.getByTestId(
        `requirements-matrix-glyph-${r1.requirementId}-${c1.elementId}-satisfy`,
      ),
    ).toHaveTextContent('«s»');
    expect(
      screen.getByTestId(
        `requirements-matrix-glyph-${r1.requirementId}-${c1.elementId}-verify`,
      ),
    ).toHaveTextContent('«v»');
  });

  it('renders empty cell when no trace exists for (requirement, target)', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const c1 = col('Brake');
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1], [c1], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    const cell = screen.getByTestId(
      `requirements-matrix-cell-${r1.requirementId}-${c1.elementId}`,
    );
    expect(cell.textContent).toBe('');
  });

  it('fires onSelectRequirement when a row label is clicked', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const onSelect = vi.fn();
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1], [], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={onSelect}
        selectedId={null}
      />,
    );
    fireEvent.click(
      screen.getByTestId(`requirements-matrix-row-${r1.requirementId}`),
    );
    expect(onSelect).toHaveBeenCalledWith(r1.requirementId);
  });

  it('fires onSelectRequirement when a cell is clicked', () => {
    const r1 = row('REQ-1', 'Stop on red');
    const c1 = col('Brake');
    const onSelect = vi.fn();
    render(
      <RequirementsMatrixPanel
        matrix={matrix(
          [r1],
          [c1],
          [
            {
              requirementId: r1.requirementId,
              elementId: c1.elementId,
              traceKinds: ['satisfy'],
            },
          ],
        )}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={onSelect}
        selectedId={null}
      />,
    );
    fireEvent.click(
      screen.getByTestId(
        `requirements-matrix-cell-${r1.requirementId}-${c1.elementId}`,
      ),
    );
    expect(onSelect).toHaveBeenCalledWith(r1.requirementId);
  });

  it('marks the selected requirement row with aria-pressed=true', () => {
    const r1 = row('REQ-1', 'Stop on red');
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1], [], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={r1.requirementId}
      />,
    );
    const rowBtn = screen.getByTestId(
      `requirements-matrix-row-${r1.requirementId}`,
    );
    expect(rowBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits filter text changes', () => {
    const onFilter = vi.fn();
    render(
      <RequirementsMatrixPanel
        matrix={matrix([], [], [])}
        filterText=""
        onFilterTextChange={onFilter}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    fireEvent.change(screen.getByTestId('requirements-matrix-filter'), {
      target: { value: 'red' },
    });
    expect(onFilter).toHaveBeenCalledWith('red');
  });

  it('renders bare name when reqId is missing', () => {
    const r1: TraceabilityRow = {
      requirementId: createElementId() as ElementId,
      reqId: '',
      name: 'Untagged',
      priority: 'medium',
      status: 'approved',
      outgoingCount: 0,
    };
    render(
      <RequirementsMatrixPanel
        matrix={matrix([r1], [], [])}
        filterText=""
        onFilterTextChange={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    const rowBtn = screen.getByTestId(
      `requirements-matrix-row-${r1.requirementId}`,
    );
    expect(rowBtn.textContent).toBe('Untagged');
  });
});
