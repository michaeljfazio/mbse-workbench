import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { Inspector } from '@/workspace/inspector/Inspector';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

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

async function bootstrap(): Promise<{ storage: Storage }> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage };
}

async function setupBlockAndRequirements() {
  await bootstrap();
  const blockId = useWorkspaceStore.getState().createBlock()!;
  const reqDiagramId = useWorkspaceStore
    .getState()
    .createDiagram('requirements', { name: 'Reqs' })!;
  const r1Id = useWorkspaceStore
    .getState()
    .createRequirement(reqDiagramId, { x: 0, y: 0 }, { name: 'R1' })!;
  const r2Id = useWorkspaceStore
    .getState()
    .createRequirement(
      reqDiagramId,
      { x: 200, y: 0 },
      { name: 'R2', reqId: 'R-002' },
    )!;
  return { blockId, reqDiagramId, r1Id, r2Id };
}

describe('<Inspector /> — TraceLinksExtras (#73)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders an empty "No requirement links" state for a block with no traces', async () => {
    const { blockId } = await setupBlockAndRequirements();
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);

    expect(screen.getByTestId('inspector-trace-links')).toBeInTheDocument();
    expect(
      screen.getByTestId('inspector-trace-links-empty'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('inspector-add-trace-link')).toBeInTheDocument();
  });

  it('lists one row per incoming RequirementTraceEdge', async () => {
    const { blockId, r1Id, r2Id } = await setupBlockAndRequirements();
    const e1 = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1Id, blockId, 'satisfy')!;
    const e2 = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r2Id, blockId, 'verify')!;
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);

    expect(
      screen.queryByTestId('inspector-trace-links-empty'),
    ).not.toBeInTheDocument();
    const list = screen.getByTestId('inspector-trace-link-list');
    expect(list).toBeInTheDocument();
    expect(
      screen.getByTestId(`inspector-trace-link-${e1}`),
    ).toHaveTextContent(/«satisfy»/);
    expect(
      screen.getByTestId(`inspector-trace-link-${e1}`),
    ).toHaveTextContent('R1');
    expect(
      screen.getByTestId(`inspector-trace-link-${e2}`),
    ).toHaveTextContent(/«verify»/);
    expect(
      screen.getByTestId(`inspector-trace-link-${e2}`),
    ).toHaveTextContent('R-002');
    expect(
      screen.getByTestId(`inspector-trace-link-${e2}`),
    ).toHaveTextContent('R2');
  });

  it('unlinks a trace via the row delete button', async () => {
    const { blockId, r1Id } = await setupBlockAndRequirements();
    const edgeId = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1Id, blockId, 'satisfy')!;
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);

    fireEvent.click(
      screen.getByTestId(`inspector-trace-link-delete-${edgeId}`),
    );
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === edgeId),
    ).toBeUndefined();
  });

  it('opens the LinkRequirementPopover and dispatches a link command on kind pick', async () => {
    const { blockId, r1Id } = await setupBlockAndRequirements();
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);

    fireEvent.click(screen.getByTestId('inspector-add-trace-link'));
    expect(screen.getByTestId('link-requirement-popover')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`link-requirement-row-${r1Id}`));
    // For a non-Requirement target, only satisfy/verify are valid.
    expect(screen.getByTestId('link-requirement-kind-derive')).toBeDisabled();
    expect(screen.getByTestId('link-requirement-kind-refine')).toBeDisabled();
    expect(screen.getByTestId('link-requirement-kind-satisfy')).toBeEnabled();

    fireEvent.click(screen.getByTestId('link-requirement-kind-satisfy'));

    expect(screen.queryByTestId('link-requirement-popover')).not.toBeInTheDocument();
    const traces = useWorkspaceStore
      .getState()
      .edges.filter((e) => e.kind === 'RequirementTrace');
    expect(traces).toHaveLength(1);
    expect(traces[0]!.sourceId).toBe(r1Id);
    expect(traces[0]!.targetId).toBe(blockId);
    if (traces[0]!.kind === 'RequirementTrace') {
      expect(traces[0]!.traceKind).toBe('satisfy');
    }
  });

  it('enables all four kinds when the target is a Requirement', async () => {
    const { blockId: _block, r1Id, r2Id } = await setupBlockAndRequirements();
    useWorkspaceStore.getState().setSelection([r2Id]);
    render(<Inspector />);

    fireEvent.click(screen.getByTestId('inspector-add-trace-link'));
    fireEvent.click(screen.getByTestId(`link-requirement-row-${r1Id}`));
    for (const kind of ['derive', 'satisfy', 'verify', 'refine'] as const) {
      expect(screen.getByTestId(`link-requirement-kind-${kind}`)).toBeEnabled();
    }
  });

  it('search filters the requirements list', async () => {
    const { blockId, r1Id, r2Id } = await setupBlockAndRequirements();
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);

    fireEvent.click(screen.getByTestId('inspector-add-trace-link'));
    const search = screen.getByTestId('link-requirement-search');
    fireEvent.change(search, { target: { value: 'R-002' } });
    expect(
      screen.queryByTestId(`link-requirement-row-${r1Id}`),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`link-requirement-row-${r2Id}`),
    ).toBeInTheDocument();
  });

  it('Escape closes the popover without dispatching', async () => {
    const { blockId } = await setupBlockAndRequirements();
    useWorkspaceStore.getState().setSelection([blockId]);
    render(<Inspector />);
    const linkCountBefore = useWorkspaceStore.getState().edges.length;

    fireEvent.click(screen.getByTestId('inspector-add-trace-link'));
    expect(screen.getByTestId('link-requirement-popover')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.queryByTestId('link-requirement-popover'),
    ).not.toBeInTheDocument();
    expect(useWorkspaceStore.getState().edges.length).toBe(linkCountBefore);
  });

  it('persists the link across a saveProject + reload', async () => {
    const { storage } = await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock()!;
    const reqDiagramId = useWorkspaceStore
      .getState()
      .createDiagram('requirements', { name: 'Reqs' })!;
    const r1Id = useWorkspaceStore
      .getState()
      .createRequirement(reqDiagramId, { x: 0, y: 0 }, { name: 'R1' })!;
    const edgeId = useWorkspaceStore
      .getState()
      .linkRequirementTrace(r1Id, blockId, 'satisfy')!;
    await useWorkspaceStore.getState().saveProject();

    resetWorkspaceStoreForTests();

    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const trace = useWorkspaceStore
      .getState()
      .edges.find((e) => e.id === edgeId);
    expect(trace).toBeDefined();
    if (trace && trace.kind === 'RequirementTrace') {
      expect(trace.sourceId).toBe(r1Id);
      expect(trace.targetId).toBe(blockId);
      expect(trace.traceKind).toBe('satisfy');
    }
  });
});
