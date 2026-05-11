import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { Inspector } from '@/workspace/inspector/Inspector';
import { resetWorkspaceStoreForTests, useWorkspaceStore } from '@/workspace';

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

async function setupTrace() {
  await bootstrap();
  const reqDiagramId = useWorkspaceStore
    .getState()
    .createDiagram('requirements', { name: 'Reqs' })!;
  useWorkspaceStore.getState().setActiveDiagram(reqDiagramId);
  const r1Id = useWorkspaceStore
    .getState()
    .createRequirement(reqDiagramId, { x: 0, y: 0 }, { name: 'R1' })!;
  const r2Id = useWorkspaceStore
    .getState()
    .createRequirement(reqDiagramId, { x: 200, y: 0 }, { name: 'R2' })!;
  const edgeId = useWorkspaceStore
    .getState()
    .linkRequirementTrace(r1Id, r2Id, 'derive')!;
  return { reqDiagramId, r1Id, r2Id, edgeId };
}

describe('<Inspector /> — RequirementTraceExtras (#72)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('shows Source / Target / Trace-kind rows when a RequirementTrace edge is selected', async () => {
    const { edgeId } = await setupTrace();
    useWorkspaceStore
      .getState()
      .setSelection([edgeId as unknown as never]);
    render(<Inspector />);

    expect(screen.getByTestId('inspector-trace-edge')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-trace-source').textContent).toContain(
      'R1',
    );
    expect(screen.getByTestId('inspector-trace-target').textContent).toContain(
      'R2',
    );
    expect(screen.getByTestId('inspector-trace-kind').textContent).toBe(
      '«derive»',
    );
  });

  it('round-trips the label edit through the command bus', async () => {
    const { edgeId } = await setupTrace();
    useWorkspaceStore
      .getState()
      .setSelection([edgeId as unknown as never]);
    render(<Inspector />);

    const input = screen.getByTestId('inspector-trace-label') as HTMLInputElement;
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: 'covers spec' } });
    fireEvent.blur(input);

    const edge = useWorkspaceStore
      .getState()
      .edges.find((e) => e.id === edgeId);
    expect(edge?.label).toBe('covers spec');

    useWorkspaceStore.getState().undo();
    const afterUndo = useWorkspaceStore
      .getState()
      .edges.find((e) => e.id === edgeId);
    expect(afterUndo?.label).toBeUndefined();
  });

  it('clears the label when blurred empty', async () => {
    const { edgeId } = await setupTrace();
    useWorkspaceStore
      .getState()
      .setRequirementTraceLabel(edgeId, 'something');

    useWorkspaceStore
      .getState()
      .setSelection([edgeId as unknown as never]);
    render(<Inspector />);

    const input = screen.getByTestId('inspector-trace-label') as HTMLInputElement;
    expect(input.value).toBe('something');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    const edge = useWorkspaceStore
      .getState()
      .edges.find((e) => e.id === edgeId);
    expect(edge?.label).toBeUndefined();
  });

  it('Escape rolls back the in-flight edit without dispatching', async () => {
    const { edgeId } = await setupTrace();
    useWorkspaceStore
      .getState()
      .setSelection([edgeId as unknown as never]);
    render(<Inspector />);

    const input = screen.getByTestId('inspector-trace-label') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tmp' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    const edge = useWorkspaceStore
      .getState()
      .edges.find((e) => e.id === edgeId);
    expect(edge?.label).toBeUndefined();
    expect(input.value).toBe('');
  });
});
