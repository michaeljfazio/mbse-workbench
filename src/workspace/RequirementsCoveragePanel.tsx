import { useMemo } from 'react';

import type { ElementId, RequirementElement } from '@/model';

import type { RequirementsCoverage } from './requirements/coverage';

export interface RequirementsCoveragePanelProps {
  readonly coverage: RequirementsCoverage;
  readonly approvedOnly: boolean;
  readonly onToggleApprovedOnly: (next: boolean) => void;
  readonly onSelectRequirement: (id: ElementId) => void;
  readonly selectedId: ElementId | null;
}

function percent(numer: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((numer / denom) * 100);
}

function rowLabel(req: RequirementElement): string {
  const prefix = req.reqId?.trim() ?? '';
  return prefix === '' ? req.name : `${prefix} — ${req.name}`;
}

export function RequirementsCoveragePanel(
  props: RequirementsCoveragePanelProps,
): JSX.Element {
  const {
    coverage,
    approvedOnly,
    onToggleApprovedOnly,
    onSelectRequirement,
    selectedId,
  } = props;
  const total = coverage.totalRequirements;
  const satisfiedCount = total - coverage.unsatisfied.length;
  const verifiedCount = total - coverage.unverified.length;

  const satisfiedPct = useMemo(
    () => percent(satisfiedCount, total),
    [satisfiedCount, total],
  );
  const verifiedPct = useMemo(
    () => percent(verifiedCount, total),
    [verifiedCount, total],
  );

  return (
    <section
      data-testid="requirements-coverage-panel"
      aria-label="Requirements coverage"
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-background p-3"
      tabIndex={0}
    >
      <header className="flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Requirements coverage
        </h2>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            data-testid="requirements-coverage-approved-only"
            checked={approvedOnly}
            onChange={(e) => onToggleApprovedOnly(e.target.checked)}
            className="size-3.5 rounded border-input"
          />
          <span>Approved only</span>
        </label>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-3">
        <CoverageMeter
          testId="requirements-coverage-satisfied"
          label="Satisfied"
          count={satisfiedCount}
          total={total}
          percent={satisfiedPct}
        />
        <CoverageMeter
          testId="requirements-coverage-verified"
          label="Verified"
          count={verifiedCount}
          total={total}
          percent={verifiedPct}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <GapList
          testId="requirements-coverage-unsatisfied"
          heading="Unsatisfied"
          items={coverage.unsatisfied}
          selectedId={selectedId}
          onSelect={onSelectRequirement}
          emptyMessage={
            total === 0
              ? 'No requirements in scope.'
              : 'All in-scope requirements have a satisfy trace.'
          }
        />
        <GapList
          testId="requirements-coverage-unverified"
          heading="Unverified"
          items={coverage.unverified}
          selectedId={selectedId}
          onSelect={onSelectRequirement}
          emptyMessage={
            total === 0
              ? 'No requirements in scope.'
              : 'All in-scope requirements have a verify trace.'
          }
        />
      </div>
    </section>
  );
}

interface CoverageMeterProps {
  readonly testId: string;
  readonly label: string;
  readonly count: number;
  readonly total: number;
  readonly percent: number;
}

function CoverageMeter(props: CoverageMeterProps): JSX.Element {
  const { testId, label, count, total, percent } = props;
  return (
    <div
      data-testid={testId}
      className="rounded-md border border-border bg-card p-3"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span
          data-testid={`${testId}-count`}
          className="text-xs tabular-nums text-foreground"
        >
          {count} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percent}%`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          data-testid={`${testId}-bar`}
          className="h-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface GapListProps {
  readonly testId: string;
  readonly heading: string;
  readonly items: readonly RequirementElement[];
  readonly selectedId: ElementId | null;
  readonly onSelect: (id: ElementId) => void;
  readonly emptyMessage: string;
}

function GapList(props: GapListProps): JSX.Element {
  const { testId, heading, items, selectedId, onSelect, emptyMessage } = props;
  return (
    <div
      data-testid={testId}
      className="flex min-h-0 flex-col rounded-md border border-border bg-card"
    >
      <div className="shrink-0 border-b border-border px-3 py-2 text-xs font-medium text-foreground">
        {heading}{' '}
        <span className="tabular-nums text-muted-foreground">
          ({items.length})
        </span>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto"
        tabIndex={0}
        role="region"
        aria-label={`${heading} requirements list`}
      >
        {items.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((req) => {
              const isSelected = req.id === selectedId;
              return (
                <li key={req.id}>
                  <button
                    type="button"
                    data-testid={`${testId}-row-${req.id}`}
                    onClick={() => onSelect(req.id)}
                    aria-pressed={isSelected}
                    className={`w-full px-3 py-2 text-left text-xs text-foreground transition ${
                      isSelected ? 'bg-accent' : 'hover:bg-accent/40'
                    }`}
                  >
                    {rowLabel(req)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
