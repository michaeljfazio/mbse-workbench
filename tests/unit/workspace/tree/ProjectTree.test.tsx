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

  it('renders the Part Definitions kind group from the active viewpoint palette even when empty', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(group).toHaveAttribute('aria-level', '1');
    expect(group).toHaveAttribute('aria-label', expect.stringMatching(/Part definitions \(0\)/));
  });

  it('renders all root-Package-creatable kind groups from empty state (no elements needed)', async () => {
    // Fixes #372: definition kinds (ActionDefinition, StateDefinition,
    // ConstraintDefinition, InterfaceDefinition, PortDefinition) must be visible
    // from app load so a first-time architect can discover them via the palette.
    await bootstrap();
    render(<ProjectTree />);

    const alwaysVisible: string[] = [
      'Package',
      'PartDefinition',
      'InterfaceDefinition',
      'PortDefinition',
      'ActionDefinition',
      'StateDefinition',
      'ConstraintDefinition',
      'Requirement',
      'Actor',
      'UseCase',
    ];
    for (const kind of alwaysVisible) {
      expect(
        screen.getByTestId(`project-tree-group-${kind}`),
        `expected ${kind} group to be visible from empty state`,
      ).toBeInTheDocument();
    }
  });

  it('does not render groups for kinds that are neither creatable under root nor in any viewpoint palette', async () => {
    await bootstrap();
    render(<ProjectTree />);

    // Transition, ConnectionUsage, ItemFlow, PortUsage — none are in
    // ROOT_CREATE_BY_KIND (Package children) nor in any viewpoint paletteItems,
    // so they remain hidden until an element of that kind exists.
    for (const kind of ['Transition', 'ConnectionUsage', 'ItemFlow']) {
      expect(
        screen.queryByTestId(`project-tree-group-${kind}`),
        `expected ${kind} group to be absent from empty state`,
      ).toBeNull();
    }
  });

  it('renders the Requirements group from the Requirements viewpoint palette even when empty', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const group = screen.getByTestId('project-tree-group-Requirement');
    expect(group).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/Requirements \(0\)/),
    );
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
    expect(group).toHaveAttribute('aria-label', expect.stringMatching(/Part definitions \(2\)/));

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

    // Packages group sits above Blocks in ELEMENT_KINDS order, so step past
    // its (empty) row to reach the Blocks group baseline used by this test.
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
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

    // Step past the Packages group (empty, sits above Blocks) so this test
    // focuses on the Blocks↔leaf interaction it actually exercises.
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
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
    // Step past the Packages group so focus lands on Blocks before the
    // collapse/expand toggle is exercised.
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
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
    // Two ArrowDowns: skip past the (empty) Packages group, focus the Blocks
    // group, then drop onto the first Blocks leaf.
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
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
    // Packages now sits at the top of the palette-driven list, so Home
    // focuses Packages — not Blocks.
    const firstGroup = screen.getByTestId('project-tree-group-Package');
    const groupItems = screen.getAllByRole('treeitem', { name: /^[A-Za-z]+ \(/ });
    const lastGroupItem = groupItems[groupItems.length - 1]!;

    fireEvent.keyDown(tree, { key: 'End' });
    expect(lastGroupItem).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tree, { key: 'Home' });
    expect(firstGroup).toHaveAttribute('tabindex', '0');
  });

  it('group element count reflects only its own kind', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock();
    useWorkspaceStore.getState().createBlock();

    render(<ProjectTree />);
    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(within(group).getByText('2')).toBeInTheDocument();
  });

  it('renders a "+" create affordance on Package-member kind groups (PartDefinition)', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const button = screen.getByTestId('project-tree-group-create-PartDefinition');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'New Part Definition');
  });

  it('does not render a "+" affordance on Usage kinds (PartUsage) — those originate from diagram palettes', async () => {
    await bootstrap();
    // PartUsage is in the IBD viewpoint palette, so the group exists.
    render(<ProjectTree />);
    expect(screen.getByTestId('project-tree-group-PartUsage')).toBeInTheDocument();
    expect(
      screen.queryByTestId('project-tree-group-create-PartUsage'),
    ).toBeNull();
  });

  it('clicking "+" creates an element under the project root, selects it, and sets pendingRename', async () => {
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    render(<ProjectTree />);
    act(() => {
      fireEvent.click(
        screen.getByTestId('project-tree-group-create-PartDefinition'),
      );
    });

    const state = useWorkspaceStore.getState();
    const created = state.elements.find(
      (e) => e.ownerId === rootId && e.kind === 'PartDefinition',
    );
    expect(created).toBeDefined();
    expect(created!.name).toBe('New Part Definition');
    expect(created!.ownerRole).toBe('member');
    expect(state.selectedElementIds).toEqual([created!.id]);
    expect(state.pendingRenameElementId).toBe(created!.id);
  });

  it('clicking "+" does not toggle the group expand/collapse state', async () => {
    await bootstrap();
    render(<ProjectTree />);

    const group = screen.getByTestId('project-tree-group-PartDefinition');
    expect(group).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByTestId('project-tree-group-create-PartDefinition'));
    expect(group).toHaveAttribute('aria-expanded', 'true');
  });

  it('"+" affordance is omitted when there is no project loaded', () => {
    // No bootstrap: store has no project, no viewpoints, no elements.
    render(<ProjectTree />);
    expect(
      screen.queryByTestId('project-tree-group-create-PartDefinition'),
    ).toBeNull();
  });

  it('"+" affordance for Requirement uses the correct singular label', async () => {
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    render(<ProjectTree />);
    act(() => {
      fireEvent.click(
        screen.getByTestId('project-tree-group-create-Requirement'),
      );
    });

    const created = useWorkspaceStore
      .getState()
      .elements.find((e) => e.ownerId === rootId && e.kind === 'Requirement');
    expect(created).toBeDefined();
    expect(created!.name).toBe('New Requirement');
  });
});
