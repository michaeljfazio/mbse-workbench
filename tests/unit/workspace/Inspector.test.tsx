import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

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

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

describe('<Inspector />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders an empty placeholder when no element is selected', async () => {
    await bootstrap();
    render(<Inspector />);
    expect(screen.getByTestId('inspector-empty')).toHaveTextContent(
      /select an element/i,
    );
  });

  it('renders kind label, name input and description textarea for a single selection', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);

    expect(screen.getByTestId('inspector-single')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-single')).toHaveTextContent(
      'PartDefinition',
    );
    const nameInput = screen.getByTestId('inspector-name') as HTMLInputElement;
    expect(nameInput.value).toBe('Block 1');
    const descInput = screen.getByTestId(
      'inspector-description',
    ) as HTMLTextAreaElement;
    expect(descInput.value).toBe('');
  });

  it('commits a renamed name to the workspace store on blur', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    const nameInput = screen.getByTestId('inspector-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Engine' } });
    fireEvent.blur(nameInput);

    const after = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(after?.name).toBe('Engine');
  });

  it('does not commit an empty name and restores the prior value in the input', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    const nameInput = screen.getByTestId('inspector-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.blur(nameInput);

    expect(nameInput.value).toBe('Block 1');
    const after = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(after?.name).toBe('Block 1');
  });

  it('commits a description on blur', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    const desc = screen.getByTestId(
      'inspector-description',
    ) as HTMLTextAreaElement;
    fireEvent.change(desc, { target: { value: 'Engine rotational power.' } });
    fireEvent.blur(desc);

    const after = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(after?.documentation).toBe('Engine rotational power.');
  });

  it('renders an N-elements-selected message when more than one element is selected', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([a, b]);

    render(<Inspector />);
    expect(screen.getByTestId('inspector-multi')).toHaveTextContent(
      /2 elements selected/i,
    );
    expect(screen.queryByTestId('inspector-name')).toBeNull();
  });

  it('shows a missing-element message when the selected id no longer exists', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);
    useWorkspaceStore.getState().deleteElement(id);
    // Keep the stale selection on purpose.
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    expect(screen.getByTestId('inspector-missing')).toBeInTheDocument();
  });

  it('renders endpoint summary for a selected ConnectionUsage', async () => {
    await bootstrap();
    const defA = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().renameElement(defA, 'Engine');
    useWorkspaceStore
      .getState()
      .addPortToDefinition(defA, { name: 'power', direction: 'out' });
    const defB = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().renameElement(defB, 'Gearbox');
    useWorkspaceStore
      .getState()
      .addPortToDefinition(defB, { name: 'input', direction: 'in' });
    const ibdId = useWorkspaceStore.getState().openInternalDiagram(defA)!;
    const partA = useWorkspaceStore
      .getState()
      .createPartUsage(ibdId, defA, { x: 0, y: 0 })!;
    const partB = useWorkspaceStore
      .getState()
      .createPartUsage(ibdId, defB, { x: 200, y: 0 })!;
    const portUsageA = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === partA && e.kind === 'PartUsage')!;
    const portUsageB = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === partB && e.kind === 'PartUsage')!;
    if (portUsageA.kind !== 'PartUsage' || portUsageB.kind !== 'PartUsage') {
      throw new Error('seed failed');
    }
    const id = useWorkspaceStore.getState().connectPorts({
      source: partA,
      target: partB,
      sourceHandle: portUsageA.portUsageIds[0]!,
      targetHandle: portUsageB.portUsageIds[0]!,
    })!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    expect(screen.getByTestId('inspector-connection-endpoints')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-connection-source')).toHaveTextContent(
      /engine\.power \(out\)/i,
    );
    expect(screen.getByTestId('inspector-connection-target')).toHaveTextContent(
      /gearbox\.input \(in\)/i,
    );
  });

  it('reflects an external name change (e.g. inline rename in BlockNode) without re-mount', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([id]);

    render(<Inspector />);
    const nameInput = screen.getByTestId('inspector-name') as HTMLInputElement;
    expect(nameInput.value).toBe('Block 1');

    act(() => {
      useWorkspaceStore.getState().renameElement(id, 'Engine');
    });
    expect(nameInput.value).toBe('Engine');
  });
});
