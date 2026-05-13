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

  it('is a no-op when the requested surface is already active (preserves reference equality)', () => {
    const before = useWorkspaceStore.getState();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    const after = useWorkspaceStore.getState();
    expect(after.activeSurfaceKind).toBe('diagram');
    expect(after).toBe(before);
  });
});
