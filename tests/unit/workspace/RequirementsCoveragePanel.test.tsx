import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import {
  createElementId,
  type ElementId,
  type RequirementElement,
} from '@/model';
import { RequirementsCoveragePanel } from '@/workspace/RequirementsCoveragePanel';
import type { RequirementsCoverage } from '@/workspace/requirements/coverage';

function req(seed: string, name: string): RequirementElement {
  return {
    id: createElementId(),
    kind: 'Requirement',
    name,
    reqId: seed,
    text: '',
    priority: 'medium',
    status: 'approved',
  } as RequirementElement;
}

function coverage(overrides: Partial<RequirementsCoverage>): RequirementsCoverage {
  return {
    totalRequirements: 0,
    satisfied: new Set<ElementId>(),
    verified: new Set<ElementId>(),
    unsatisfied: [],
    unverified: [],
    ...overrides,
  };
}

describe('RequirementsCoveragePanel', () => {
  it('renders empty state with zero totals when no requirements are in scope', () => {
    render(
      <RequirementsCoveragePanel
        coverage={coverage({})}
        approvedOnly={false}
        onToggleApprovedOnly={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(
      screen.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveTextContent('0 / 0');
    expect(
      screen.getByTestId('requirements-coverage-verified-count'),
    ).toHaveTextContent('0 / 0');
    const unsat = screen.getByTestId('requirements-coverage-unsatisfied');
    expect(within(unsat).getByText(/No requirements in scope/)).toBeTruthy();
  });

  it('renders counts and percentages from coverage projection', () => {
    const r1 = req('REQ-1', 'Stop on red');
    const r2 = req('REQ-2', 'Yield');
    const r3 = req('REQ-3', 'Brake');
    const proj = coverage({
      totalRequirements: 3,
      satisfied: new Set([r1.id, r2.id]),
      verified: new Set([r1.id]),
      unsatisfied: [r3],
      unverified: [r2, r3],
    });
    render(
      <RequirementsCoveragePanel
        coverage={proj}
        approvedOnly={false}
        onToggleApprovedOnly={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    expect(
      screen.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveTextContent('2 / 3');
    expect(
      screen.getByTestId('requirements-coverage-verified-count'),
    ).toHaveTextContent('1 / 3');
    const satBar = screen.getByLabelText('Satisfied: 67%');
    expect(satBar.getAttribute('aria-valuenow')).toBe('67');
    const verBar = screen.getByLabelText('Verified: 33%');
    expect(verBar.getAttribute('aria-valuenow')).toBe('33');
  });

  it('lists gaps and fires onSelectRequirement when a row is clicked', () => {
    const r1 = req('REQ-1', 'Stop on red');
    const r2 = req('REQ-2', 'Yield');
    const onSelect = vi.fn();
    render(
      <RequirementsCoveragePanel
        coverage={coverage({
          totalRequirements: 2,
          unsatisfied: [r1, r2],
          unverified: [r2],
        })}
        approvedOnly={false}
        onToggleApprovedOnly={() => {}}
        onSelectRequirement={onSelect}
        selectedId={null}
      />,
    );
    fireEvent.click(
      screen.getByTestId(`requirements-coverage-unsatisfied-row-${r2.id}`),
    );
    expect(onSelect).toHaveBeenCalledWith(r2.id);
  });

  it('marks the selected requirement with aria-pressed=true', () => {
    const r1 = req('REQ-1', 'Stop on red');
    render(
      <RequirementsCoveragePanel
        coverage={coverage({
          totalRequirements: 1,
          unsatisfied: [r1],
          unverified: [r1],
        })}
        approvedOnly={false}
        onToggleApprovedOnly={() => {}}
        onSelectRequirement={() => {}}
        selectedId={r1.id}
      />,
    );
    const row = screen.getByTestId(
      `requirements-coverage-unsatisfied-row-${r1.id}`,
    );
    expect(row.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles the approved-only filter via the checkbox', () => {
    const onToggle = vi.fn();
    render(
      <RequirementsCoveragePanel
        coverage={coverage({})}
        approvedOnly={false}
        onToggleApprovedOnly={onToggle}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    fireEvent.click(
      screen.getByTestId('requirements-coverage-approved-only'),
    );
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('renders bare name when reqId is missing or empty', () => {
    const r = req('', 'Untagged');
    render(
      <RequirementsCoveragePanel
        coverage={coverage({
          totalRequirements: 1,
          unsatisfied: [r],
        })}
        approvedOnly={false}
        onToggleApprovedOnly={() => {}}
        onSelectRequirement={() => {}}
        selectedId={null}
      />,
    );
    const row = screen.getByTestId(
      `requirements-coverage-unsatisfied-row-${r.id}`,
    );
    expect(row.textContent).toBe('Untagged');
  });
});
