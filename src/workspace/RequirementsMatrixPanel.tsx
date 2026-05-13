import type { ElementId, RequirementTraceKind } from '@/model';

import {
  cellKey,
  type TraceabilityMatrix,
  type TraceabilityRow,
} from './requirements/matrix';

export interface RequirementsMatrixPanelProps {
  readonly matrix: TraceabilityMatrix;
  readonly filterText: string;
  readonly onFilterTextChange: (next: string) => void;
  readonly onSelectRequirement: (id: ElementId) => void;
  readonly selectedId: ElementId | null;
}

const TRACE_GLYPHS: Readonly<Record<RequirementTraceKind, string>> = {
  satisfy: '«s»',
  verify: '«v»',
  derive: '«d»',
  refine: '«r»',
};

function rowLabel(row: TraceabilityRow): string {
  const prefix = row.reqId.trim();
  return prefix === '' ? row.name : `${prefix} — ${row.name}`;
}

export function RequirementsMatrixPanel(
  props: RequirementsMatrixPanelProps,
): JSX.Element {
  const {
    matrix,
    filterText,
    onFilterTextChange,
    onSelectRequirement,
    selectedId,
  } = props;
  const { rows, columns, cells } = matrix;

  return (
    <section
      data-testid="requirements-matrix-panel"
      aria-label="Requirements traceability matrix"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-background p-3"
      tabIndex={0}
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Requirements traceability matrix
        </h2>
        <input
          type="text"
          data-testid="requirements-matrix-filter"
          aria-label="Filter requirements"
          placeholder="Filter by reqId or name…"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          className="h-7 w-56 rounded-md border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground"
        />
      </header>

      {rows.length === 0 ? (
        <div
          data-testid="requirements-matrix-empty"
          className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground"
        >
          No requirements in scope.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
          <table className="min-w-full border-collapse text-xs text-foreground">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">
                  Requirement
                </th>
                {columns.map((col) => (
                  <th
                    key={col.elementId}
                    data-testid={`requirements-matrix-column-${col.elementId}`}
                    title={`${col.kind}: ${col.name}`}
                    className="border-l border-border px-3 py-2 text-left font-medium"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = row.requirementId === selectedId;
                return (
                  <tr
                    key={row.requirementId}
                    className="border-b border-border/50"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card px-3 py-1 text-left font-normal"
                    >
                      <button
                        type="button"
                        data-testid={`requirements-matrix-row-${row.requirementId}`}
                        onClick={() => onSelectRequirement(row.requirementId)}
                        aria-pressed={isSelected}
                        className={`w-full text-left transition ${
                          isSelected ? 'font-semibold text-foreground' : 'text-foreground hover:underline'
                        }`}
                      >
                        {rowLabel(row)}
                      </button>
                    </th>
                    {columns.map((col) => {
                      const cell = cells.get(
                        cellKey(row.requirementId, col.elementId),
                      );
                      return (
                        <td
                          key={col.elementId}
                          data-testid={`requirements-matrix-cell-${row.requirementId}-${col.elementId}`}
                          onClick={
                            cell
                              ? () => onSelectRequirement(row.requirementId)
                              : undefined
                          }
                          className={`border-l border-border px-3 py-1 align-top tabular-nums ${
                            cell ? 'cursor-pointer hover:bg-accent/40' : ''
                          }`}
                        >
                          {cell ? (
                            <div className="flex flex-col gap-0.5">
                              {cell.traceKinds.map((kind) => (
                                <span
                                  key={kind}
                                  data-testid={`requirements-matrix-glyph-${row.requirementId}-${col.elementId}-${kind}`}
                                  className="font-mono text-[10px] leading-tight"
                                >
                                  {TRACE_GLYPHS[kind]}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
