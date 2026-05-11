import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { ProjectTree, PROJECT_TREE_DRAG_TYPE } from '@/workspace/tree/ProjectTree';
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

async function bootstrap(): Promise<void> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

describe('<ProjectTree />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the Blocks kind group from the active viewpoint palette even when empty', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(group).toHaveAttribute('aria-level', '1');
    expect(group).toHaveAttribute('aria-label', expect.stringMatching(/Blocks \(0\)/));
  });

  it('does not render groups for kinds with no elements and no palette item', async () => {
    await bootstrap();
    render(<ProjectTree />);

    expect(screen.queryByTestId('project-tree-group-UseCase')).toBeNull();
    expect(screen.queryByTestId('project-tree-group-Requirement')).toBeNull();
  });

  it('lists elements under their kind group, sorted by name', async () => {
    await bootstrap();
    const idA = useWorkspaceStore.getState().createBlock()!;
    const idB = useWorkspaceStore.getState().createBlock()!;
    act(() => {
      useWorkspaceStore.getState().renameElement(idA, 'Wheel');
      useWorkspaceStore.getState().renameElement(idB, 'Engine');
    });

    render(<ProjectTree />);
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('aria-label', expect.stringMatching(/Blocks \(2\)/));

    const leaves = screen.getAllByTestId(/^project-tree-leaf-/);
    expect(leaves).toHaveLength(2);
    expect(leaves[0]).toHaveTextContent('Engine');
    expect(leaves[1]).toHaveTextContent('Wheel');
  });

  it('clicking a leaf sets the workspace selection to its element id', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    render(<ProjectTree />);
    const leaf = screen.getByTestId(`project-tree-leaf-${id}`);
    fireEvent.click(leaf);

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([id]);
  });

  it('external selection (canvas → store) flips aria-selected on the matching leaf', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    render(<ProjectTree />);
    const leaf = screen.getByTestId(`project-tree-leaf-${id}`);
    expect(leaf).toHaveAttribute('aria-selected', 'false');

    act(() => {
      useWorkspaceStore.getState().setSelection([id]);
    });
    expect(leaf).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a group toggles aria-expanded and hides its children when collapsed', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    render(<ProjectTree />);
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(`project-tree-leaf-${id}`)).toBeInTheDocument();

    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`project-tree-leaf-${id}`)).toBeNull();

    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(`project-tree-leaf-${id}`)).toBeInTheDocument();
  });

  it('group header for a palette-item kind is draggable and sets the kind on dataTransfer', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('draggable', 'true');

    const data = new Map<string, string>();
    const setData = (type: string, value: string): void => {
      data.set(type, value);
    };
    const dataTransfer = {
      setData,
      getData: (type: string) => data.get(type) ?? '',
      effectAllowed: 'none' as DataTransfer['effectAllowed'],
      types: [] as readonly string[],
    } as unknown as DataTransfer;
    fireEvent.dragStart(group, { dataTransfer });

    expect(data.get(PROJECT_TREE_DRAG_TYPE)).toBe('PartDefinition');
  });

  it('arrow keys move focus through visible items via roving tabindex', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    act(() => {
      useWorkspaceStore.getState().renameElement(a, 'Aaa');
      useWorkspaceStore.getState().renameElement(b, 'Bbb');
    });

    render(<ProjectTree />);
    const tree = screen.getByTestId('project-tree');
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    const leafA = screen.getByTestId(`project-tree-leaf-${a}`);
    const leafB = screen.getByTestId(`project-tree-leaf-${b}`);

    expect(group).toHaveAttribute('tabindex', '0');
    expect(leafA).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(group).toHaveAttribute('tabindex', '-1');
    expect(leafA).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(leafB).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tree, { key: 'ArrowUp' });
    expect(leafA).toHaveAttribute('tabindex', '0');
  });

  it('ArrowRight on an expanded group focuses its first child; ArrowLeft on a child focuses the group', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    render(<ProjectTree />);
    const tree = screen.getByTestId('project-tree');
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    const leaf = screen.getByTestId(`project-tree-leaf-${id}`);

    expect(group).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(leaf).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(group).toHaveAttribute('tabindex', '0');
  });

  it('ArrowLeft on an expanded group collapses it; ArrowRight on a collapsed group expands it', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock();

    render(<ProjectTree />);
    const tree = screen.getByTestId('project-tree');
    const group = screen.getByTestId('project-tree-group-PartDefinition');

    expect(group).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(group).toHaveAttribute('aria-expanded', 'true');
  });

  it('Enter on a leaf selects its element', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    render(<ProjectTree />);
    const tree = screen.getByTestId('project-tree');
    fireEvent.keyDown(tree, { key: 'ArrowDown' }); // focus leaf
    fireEvent.keyDown(tree, { key: 'Enter' });

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([id]);
  });

  it('Home/End jump to first and last visible items', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    act(() => {
      useWorkspaceStore.getState().renameElement(a, 'Aaa');
      useWorkspaceStore.getState().renameElement(b, 'Bbb');
    });

    render(<ProjectTree />);
    const tree = screen.getByTestId('project-tree');
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    const leafB = screen.getByTestId(`project-tree-leaf-${b}`);

    fireEvent.keyDown(tree, { key: 'End' });
    expect(leafB).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tree, { key: 'Home' });
    expect(group).toHaveAttribute('tabindex', '0');
  });

  it('group element count reflects only its own kind', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock();
    useWorkspaceStore.getState().createBlock();

    render(<ProjectTree />);
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(within(group).getByText('2')).toBeInTheDocument();
  });
});
