import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { REQUIREMENTS_VIEWPOINT_ID } from '@/viewpoints';
import { RequirementsSurface } from '@/workspace/RequirementsSurface';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import type { DiagramId } from '@/workspace';

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

function ensureRequirementsDiagram(): DiagramId {
  const state = useWorkspaceStore.getState();
  const existing = state.diagrams.find(
    (d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID,
  );
  if (existing) return existing.id;
  const id = state.createDiagram(REQUIREMENTS_VIEWPOINT_ID);
  if (!id) throw new Error('failed to create requirements diagram');
  return id;
}

describe('<RequirementsSurface />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the empty state when no requirements exist', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    expect(screen.getByTestId('requirements-surface-empty').textContent).toMatch(
      /No requirements yet/,
    );
    expect(screen.getByTestId('requirements-surface-count').textContent).toMatch(
      /0 requirements/,
    );
  });

  it('renders rows sorted by reqId asc, with traceCount populated', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    const r2 = state.createRequirement(diagramId, { x: 0, y: 100 });
    if (!r1 || !r2) throw new Error('createRequirement failed');
    useWorkspaceStore.getState().setRequirementReqId(r1, 'REQ-002');
    useWorkspaceStore.getState().setRequirementReqId(r2, 'REQ-001');
    useWorkspaceStore.getState().linkRequirementTrace(r1, r2, 'derive');

    render(<RequirementsSurface />);
    const table = screen.getByTestId('requirements-surface-table');
    const cells = table.querySelectorAll('tbody tr td:first-child');
    expect(cells[0]?.textContent).toBe('REQ-001');
    expect(cells[1]?.textContent).toBe('REQ-002');
    expect(screen.getByTestId('requirements-surface-count').textContent).toMatch(
      /2 requirements/,
    );
    const traces = table.querySelectorAll('tbody tr td:last-child');
    expect(traces[0]?.textContent).toBe('1');
    expect(traces[1]?.textContent).toBe('1');
  });

  it('filters rows live as the user types into the filter input', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    const r2 = state.createRequirement(diagramId, { x: 0, y: 100 });
    if (!r1 || !r2) throw new Error('createRequirement failed');
    useWorkspaceStore.getState().setRequirementReqId(r1, 'REQ-001');
    useWorkspaceStore.getState().setRequirementReqId(r2, 'REQ-002');
    useWorkspaceStore.getState().setRequirementText(r1, 'voltage stays within range');
    useWorkspaceStore.getState().setRequirementText(r2, 'mass shall not exceed 5kg');

    render(<RequirementsSurface />);
    const input = screen.getByTestId('requirements-surface-filter') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'voltage' } });
    });
    expect(screen.queryByTestId(`requirements-surface-row-${r1}`)).not.toBeNull();
    expect(screen.queryByTestId(`requirements-surface-row-${r2}`)).toBeNull();
    expect(screen.getByTestId('requirements-surface-count').textContent).toMatch(
      /1 requirement(?!s)/,
    );
  });

  it('Add Requirement button is disabled when no Requirements diagram exists', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    const button = screen.getByTestId(
      'requirements-surface-add',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('Add Requirement button creates a requirement and selects it', async () => {
    await bootstrap();
    ensureRequirementsDiagram();
    render(<RequirementsSurface />);
    const button = screen.getByTestId(
      'requirements-surface-add',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    act(() => {
      fireEvent.click(button);
    });
    const state = useWorkspaceStore.getState();
    const reqs = state.elements.filter((e) => e.kind === 'Requirement');
    expect(reqs.length).toBe(1);
    expect(state.selectedElementIds).toEqual([reqs[0]!.id]);
    expect(screen.getByTestId('requirements-surface-form')).toBeTruthy();
  });

  it('clicking a row selects it and opens the editor form', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');

    render(<RequirementsSurface />);
    expect(screen.queryByTestId('requirements-surface-form')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByTestId(`requirements-surface-row-${r1}`));
    });
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([r1]);
    expect(screen.getByTestId('requirements-surface-form')).toBeTruthy();
  });

  it('form edits commit through store actions', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');
    act(() => {
      useWorkspaceStore.getState().setSelection([r1]);
    });

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.change(screen.getByTestId('requirements-form-reqId'), {
        target: { value: 'REQ-042' },
      });
      fireEvent.change(screen.getByTestId('requirements-form-name'), {
        target: { value: 'Battery capacity' },
      });
      fireEvent.change(screen.getByTestId('requirements-form-text'), {
        target: { value: 'System shall hold 50 kWh.' },
      });
      fireEvent.change(screen.getByTestId('requirements-form-priority'), {
        target: { value: 'high' },
      });
      fireEvent.change(screen.getByTestId('requirements-form-status'), {
        target: { value: 'approved' },
      });
      fireEvent.change(screen.getByTestId('requirements-form-rationale'), {
        target: { value: 'Range target.' },
      });
    });
    const req = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === r1);
    if (!req || req.kind !== 'Requirement') throw new Error('lost requirement');
    expect(req.reqId).toBe('REQ-042');
    expect(req.name).toBe('Battery capacity');
    expect(req.text).toBe('System shall hold 50 kWh.');
    expect(req.priority).toBe('high');
    expect(req.status).toBe('approved');
    expect(req.rationale).toBe('Range target.');
  });

  it('Delete button removes the requirement and clears selection', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');
    act(() => {
      useWorkspaceStore.getState().setSelection([r1]);
    });

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-surface-delete'));
    });
    const state = useWorkspaceStore.getState();
    expect(state.elements.find((e) => e.id === r1)).toBeUndefined();
    expect(state.selectedElementIds).toEqual([]);
    expect(screen.queryByTestId('requirements-surface-form')).toBeNull();
  });

  it('shows the "no match" empty state when the filter matches nothing', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.change(screen.getByTestId('requirements-surface-filter'), {
        target: { value: 'zzz-no-match-zzz' },
      });
    });
    expect(screen.getByTestId('requirements-surface-empty').textContent).toMatch(
      /No requirements match/,
    );
  });
});

describe('workspace store — activeSurfaceKind', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('defaults to "diagram"', () => {
    expect(useWorkspaceStore.getState().activeSurfaceKind).toBe('diagram');
  });

  it('setActiveSurface toggles between "diagram" and "requirements"', () => {
    useWorkspaceStore.getState().setActiveSurface('requirements');
    expect(useWorkspaceStore.getState().activeSurfaceKind).toBe('requirements');
    useWorkspaceStore.getState().setActiveSurface('diagram');
    expect(useWorkspaceStore.getState().activeSurfaceKind).toBe('diagram');
  });

  it('setActiveSurface clears selectedElementIds on change (no stale Inspector)', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');
    useWorkspaceStore.getState().setSelection([r1]);
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([r1]);
    useWorkspaceStore.getState().setActiveSurface('requirements');
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
  });

  it('is a no-op when the requested surface is already active (preserves reference equality)', () => {
    const before = useWorkspaceStore.getState();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    const after = useWorkspaceStore.getState();
    expect(after.activeSurfaceKind).toBe('diagram');
    expect(after).toBe(before);
  });
});

describe('workspace store — requirementsSurfaceTab + coverageApprovedOnly', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('defaults requirementsSurfaceTab to "editor" and coverageApprovedOnly to false', () => {
    const state = useWorkspaceStore.getState();
    expect(state.requirementsSurfaceTab).toBe('editor');
    expect(state.coverageApprovedOnly).toBe(false);
  });

  it('setRequirementsSurfaceTab switches between "editor" and "coverage"', () => {
    useWorkspaceStore.getState().setRequirementsSurfaceTab('coverage');
    expect(useWorkspaceStore.getState().requirementsSurfaceTab).toBe('coverage');
    useWorkspaceStore.getState().setRequirementsSurfaceTab('editor');
    expect(useWorkspaceStore.getState().requirementsSurfaceTab).toBe('editor');
  });

  it('setCoverageApprovedOnly toggles the flag', () => {
    useWorkspaceStore.getState().setCoverageApprovedOnly(true);
    expect(useWorkspaceStore.getState().coverageApprovedOnly).toBe(true);
    useWorkspaceStore.getState().setCoverageApprovedOnly(false);
    expect(useWorkspaceStore.getState().coverageApprovedOnly).toBe(false);
  });

  it('both setters preserve reference equality when value is unchanged', () => {
    const before = useWorkspaceStore.getState();
    useWorkspaceStore.getState().setRequirementsSurfaceTab('editor');
    useWorkspaceStore.getState().setCoverageApprovedOnly(false);
    expect(useWorkspaceStore.getState()).toBe(before);
  });
});

describe('<RequirementsSurface /> — Editor | Coverage sub-tablist', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the Editor tab selected by default and shows the editor panel', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    const editorTab = screen.getByTestId('requirements-tab-editor-button');
    const coverageTab = screen.getByTestId('requirements-tab-coverage-button');
    expect(editorTab.getAttribute('aria-selected')).toBe('true');
    expect(coverageTab.getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('requirements-editor-tabpanel')).toBeTruthy();
    expect(screen.queryByTestId('requirements-coverage-tabpanel')).toBeNull();
  });

  it('clicking the Coverage tab swaps panels and reflects in store state', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-coverage-button'));
    });
    expect(useWorkspaceStore.getState().requirementsSurfaceTab).toBe('coverage');
    expect(screen.getByTestId('requirements-coverage-tabpanel')).toBeTruthy();
    expect(screen.queryByTestId('requirements-editor-tabpanel')).toBeNull();
    expect(screen.getByTestId('requirements-coverage-panel')).toBeTruthy();
  });

  it('aria-controls on each tab matches the rendered panel id', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    const editorTab = screen.getByTestId('requirements-tab-editor-button');
    const coverageTab = screen.getByTestId('requirements-tab-coverage-button');
    expect(editorTab.getAttribute('aria-controls')).toBe(
      'requirements-editor-panel',
    );
    expect(coverageTab.getAttribute('aria-controls')).toBe(
      'requirements-coverage-panel',
    );
    expect(screen.getByTestId('requirements-editor-tabpanel').id).toBe(
      'requirements-editor-panel',
    );
    act(() => {
      fireEvent.click(coverageTab);
    });
    expect(screen.getByTestId('requirements-coverage-tabpanel').id).toBe(
      'requirements-coverage-panel',
    );
  });

  it('clicking a gap-list row selects the requirement and returns to the Editor tab', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-coverage-button'));
    });
    // The new requirement is unsatisfied → appears in the unsatisfied gap list.
    const row = screen.getByTestId(
      `requirements-coverage-unsatisfied-row-${r1}`,
    );
    act(() => {
      fireEvent.click(row);
    });
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([r1]);
    expect(useWorkspaceStore.getState().requirementsSurfaceTab).toBe('editor');
    expect(screen.getByTestId('requirements-surface-form')).toBeTruthy();
  });

  it('toggling "Approved only" narrows the coverage scope via the store flag', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const r1 = useWorkspaceStore
      .getState()
      .createRequirement(diagramId, { x: 0, y: 0 });
    if (!r1) throw new Error('createRequirement failed');
    // r1 stays in default 'draft' status; "Approved only" should drop it from scope.

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-coverage-button'));
    });
    // Draft requirement appears unsatisfied before the toggle.
    expect(
      screen.queryByTestId(`requirements-coverage-unsatisfied-row-${r1}`),
    ).not.toBeNull();
    act(() => {
      fireEvent.click(
        screen.getByTestId('requirements-coverage-approved-only'),
      );
    });
    expect(useWorkspaceStore.getState().coverageApprovedOnly).toBe(true);
    // After scoping to approved only, the draft requirement is out of scope.
    expect(
      screen.queryByTestId(`requirements-coverage-unsatisfied-row-${r1}`),
    ).toBeNull();
  });
});

describe('<RequirementsSurface /> — Matrix tab', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the Matrix tab button with stable testid and aria-controls', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    const matrixTab = screen.getByTestId('requirements-tab-matrix-button');
    expect(matrixTab.getAttribute('aria-selected')).toBe('false');
    expect(matrixTab.getAttribute('aria-controls')).toBe(
      'requirements-matrix-panel',
    );
  });

  it('clicking the Matrix tab swaps panels, updates store, and mounts the matrix panel', async () => {
    await bootstrap();
    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-matrix-button'));
    });
    expect(useWorkspaceStore.getState().requirementsSurfaceTab).toBe('matrix');
    expect(screen.getByTestId('requirements-matrix-tabpanel')).toBeTruthy();
    expect(screen.queryByTestId('requirements-editor-tabpanel')).toBeNull();
    expect(screen.queryByTestId('requirements-coverage-tabpanel')).toBeNull();
    expect(screen.getByTestId('requirements-matrix-panel')).toBeTruthy();
  });

  it('renders matrix rows + glyphs for satisfy/derive traces and selects on cell click', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    const r2 = state.createRequirement(diagramId, { x: 0, y: 100 });
    if (!r1 || !r2) throw new Error('createRequirement failed');
    useWorkspaceStore.getState().setRequirementReqId(r1, 'REQ-A');
    useWorkspaceStore.getState().setRequirementReqId(r2, 'REQ-B');
    useWorkspaceStore.getState().linkRequirementTrace(r1, r2, 'derive');

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-matrix-button'));
    });

    // REQ-A → REQ-B derive cell exists with «d» glyph.
    expect(
      screen.getByTestId(`requirements-matrix-cell-${r1}-${r2}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`requirements-matrix-glyph-${r1}-${r2}-derive`)
        .textContent,
    ).toBe('«d»');

    act(() => {
      fireEvent.click(
        screen.getByTestId(`requirements-matrix-cell-${r1}-${r2}`),
      );
    });
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([r1]);
  });

  it('filter input narrows visible matrix rows by reqId substring', async () => {
    await bootstrap();
    const diagramId = ensureRequirementsDiagram();
    const state = useWorkspaceStore.getState();
    const r1 = state.createRequirement(diagramId, { x: 0, y: 0 });
    const r2 = state.createRequirement(diagramId, { x: 0, y: 100 });
    if (!r1 || !r2) throw new Error('createRequirement failed');
    useWorkspaceStore.getState().setRequirementReqId(r1, 'AAA-1');
    useWorkspaceStore.getState().setRequirementReqId(r2, 'BBB-2');

    render(<RequirementsSurface />);
    act(() => {
      fireEvent.click(screen.getByTestId('requirements-tab-matrix-button'));
    });

    expect(screen.queryByTestId(`requirements-matrix-row-${r1}`)).not.toBeNull();
    expect(screen.queryByTestId(`requirements-matrix-row-${r2}`)).not.toBeNull();

    act(() => {
      fireEvent.change(screen.getByTestId('requirements-matrix-filter'), {
        target: { value: 'AAA' },
      });
    });
    expect(screen.queryByTestId(`requirements-matrix-row-${r1}`)).not.toBeNull();
    expect(screen.queryByTestId(`requirements-matrix-row-${r2}`)).toBeNull();
  });
});
