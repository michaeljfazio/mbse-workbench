import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import type { ElementId } from '@/model';
import { isLibraryElement } from '@/library';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { ContainmentTree } from '@/workspace/tree/ContainmentTree';
import { PROJECT_TREE_DRAG_ELEMENT_ID } from '@/workspace/tree/ProjectTree';
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

function rootId(): ElementId {
  const id = useWorkspaceStore.getState().project?.rootId;
  if (!id) throw new Error('no root');
  return id;
}

describe('<ContainmentTree />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the project root element as the top node', async () => {
    await bootstrap();
    render(<ContainmentTree />);

    const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
    expect(root).toHaveAttribute('aria-level', '1');
    expect(root).toHaveAttribute('data-depth', '0');
  });

  it('nests created blocks under the project root', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    act(() => {
      useWorkspaceStore.getState().renameElement(a, 'Aaa');
      useWorkspaceStore.getState().renameElement(b, 'Bbb');
    });

    render(<ContainmentTree />);
    const aLeaf = screen.getByTestId(`containment-tree-element-${a}`);
    const bLeaf = screen.getByTestId(`containment-tree-element-${b}`);
    expect(aLeaf).toHaveAttribute('aria-level', '2');
    expect(bLeaf).toHaveAttribute('aria-level', '2');
  });

  it('renders a stereotype icon for each element row with data-kind-icon', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    const rootRow = screen.getByTestId(`containment-tree-element-${rootId()}`);
    const blockRow = screen.getByTestId(`containment-tree-element-${a}`);

    const rootIcon = rootRow.querySelector('[data-kind-icon]');
    const blockIcon = blockRow.querySelector('[data-kind-icon]');
    expect(rootIcon).not.toBeNull();
    expect(blockIcon).not.toBeNull();
    expect(rootIcon!.getAttribute('data-kind-icon')).toBe('Package');
    expect(blockIcon!.getAttribute('data-kind-icon')).toBe('PartDefinition');
    expect(rootIcon!.tagName.toLowerCase()).toBe('svg');
    expect(rootIcon!.getAttribute('aria-hidden')).toBe('true');
  });

  it('clicking an element node selects it in the workspace store', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    fireEvent.click(screen.getByTestId(`containment-tree-element-${a}`));
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([a]);
  });

  it('reflects external selection via aria-selected', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    const leaf = screen.getByTestId(`containment-tree-element-${a}`);
    expect(leaf).toHaveAttribute('aria-selected', 'false');

    act(() => {
      useWorkspaceStore.getState().setSelection([a]);
    });
    expect(leaf).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the default diagram as a representation under the root', async () => {
    await bootstrap();
    const diagramId = useWorkspaceStore.getState().diagrams[0]!.id;

    render(<ContainmentTree />);
    const dg = screen.getByTestId(`containment-tree-diagram-${diagramId}`);
    expect(dg).toHaveAttribute('aria-level', '2');
    expect(dg).toHaveAttribute('aria-current', 'page');
  });

  it('clicking a diagram row activates that diagram', async () => {
    await bootstrap();
    const second = useWorkspaceStore.getState().createDiagram(
      useWorkspaceStore.getState().viewpoints.list()[0]!.id,
    );
    expect(second).not.toBeNull();

    render(<ContainmentTree />);
    const dgRow = screen.getByTestId(`containment-tree-diagram-${second!}`);
    fireEvent.click(dgRow);
    expect(useWorkspaceStore.getState().activeDiagramId).toBe(second);
  });

  it('expand/collapse: clicking the disclosure caret toggles aria-expanded', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
    expect(root).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(`containment-tree-element-${a}`)).toBeInTheDocument();

    const caret = screen.getByTestId(
      `containment-tree-element-disclosure-${rootId()}`,
    );
    fireEvent.click(caret);
    expect(root).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByTestId(`containment-tree-element-${a}`),
    ).toBeNull();

    fireEvent.click(caret);
    expect(root).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(`containment-tree-element-${a}`)).toBeInTheDocument();
  });

  it('ArrowDown / ArrowUp move roving tabindex through visible rows', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    act(() => {
      useWorkspaceStore.getState().renameElement(a, 'Aaa');
    });

    render(<ContainmentTree />);
    const tree = screen.getByTestId('containment-tree');
    const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
    const leaf = screen.getByTestId(`containment-tree-element-${a}`);

    expect(root).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(leaf).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(tree, { key: 'ArrowUp' });
    expect(root).toHaveAttribute('tabindex', '0');
  });

  it('ArrowLeft on an expanded node with children collapses it', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock();

    render(<ContainmentTree />);
    const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
    expect(root).toHaveAttribute('aria-expanded', 'true');

    const tree = screen.getByTestId('containment-tree');
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(root).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveal-in-tree: external selection auto-expands collapsed ancestors', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
    const caret = screen.getByTestId(
      `containment-tree-element-disclosure-${rootId()}`,
    );
    fireEvent.click(caret);
    expect(root).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`containment-tree-element-${a}`)).toBeNull();

    act(() => {
      useWorkspaceStore.getState().setSelection([a]);
    });

    await waitFor(() => {
      expect(root).toHaveAttribute('aria-expanded', 'true');
    });
    expect(
      screen.getByTestId(`containment-tree-element-${a}`),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('reveal-in-tree: scrollIntoView is called on the selected row', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;

    render(<ContainmentTree />);
    scrollSpy.mockClear();

    act(() => {
      useWorkspaceStore.getState().setSelection([a]);
    });

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  it('reveal-in-tree: scrollIntoView is called when a diagram becomes active', async () => {
    await bootstrap();
    const second = useWorkspaceStore.getState().createDiagram(
      useWorkspaceStore.getState().viewpoints.list()[0]!.id,
    )!;
    // Switch back to the first diagram so activating `second` is a real change.
    const first = useWorkspaceStore.getState().diagrams[0]!.id;
    act(() => {
      useWorkspaceStore.getState().setActiveDiagram(first);
    });

    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;

    render(<ContainmentTree />);
    scrollSpy.mockClear();

    act(() => {
      useWorkspaceStore.getState().setActiveDiagram(second);
    });

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  it('pendingRenameElementId: enters rename mode and clears the pending flag (T-13.34)', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    expect(
      screen.queryByTestId(`containment-tree-element-rename-${a}`),
    ).toBeNull();

    act(() => {
      useWorkspaceStore.getState().setPendingRename(a);
    });

    expect(
      await screen.findByTestId(`containment-tree-element-rename-${a}`),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useWorkspaceStore.getState().pendingRenameElementId).toBeNull();
    });
  });

  it('pendingRenameElementId: missing element id is dropped without entering rename (T-13.34)', async () => {
    await bootstrap();

    render(<ContainmentTree />);

    act(() => {
      useWorkspaceStore.getState().setPendingRename(
        'never-existed' as ElementId,
      );
    });

    await waitFor(() => {
      expect(useWorkspaceStore.getState().pendingRenameElementId).toBeNull();
    });
    expect(
      screen.queryByTestId('containment-tree-element-rename-never-existed'),
    ).toBeNull();
  });

  it('Enter on an element row selects it', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;

    render(<ContainmentTree />);
    const tree = screen.getByTestId('containment-tree');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'Enter' });
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([a]);
  });

  describe('row menu (T-13.33)', () => {
    it('renders a kebab trigger on every element row', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      expect(
        screen.getByTestId(`containment-tree-element-menu-trigger-${rootId()}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      ).toBeInTheDocument();
    });

    it('clicking the kebab opens the menu and does not activate the row', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      const before = useWorkspaceStore.getState().selectedElementIds;
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual(before);
    });

    it('Rename action puts the row into edit mode; Enter commits via the store', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(a, 'Before');
      });

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-rename-${a}`),
      );

      const input = await screen.findByTestId(
        `containment-tree-element-rename-${a}`,
      );
      fireEvent.change(input, { target: { value: 'After' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        const el = useWorkspaceStore
          .getState()
          .elements.find((e) => e.id === a);
        expect(el?.name).toBe('After');
      });
    });

    it('Rename Escape cancels without mutating the element name', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(a, 'Keep');
      });

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-rename-${a}`),
      );

      const input = await screen.findByTestId(
        `containment-tree-element-rename-${a}`,
      );
      fireEvent.change(input, { target: { value: 'Discarded' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      const el = useWorkspaceStore.getState().elements.find((e) => e.id === a);
      expect(el?.name).toBe('Keep');
      expect(
        screen.queryByTestId(`containment-tree-element-rename-${a}`),
      ).toBeNull();
    });

    it('Delete action removes the element via the store', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-delete-${a}`),
      );

      await waitFor(() => {
        expect(
          useWorkspaceStore.getState().elements.find((e) => e.id === a),
        ).toBeUndefined();
      });
    });

    it('Delete is hidden for the project root (ownerId === null)', async () => {
      await bootstrap();

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      expect(
        screen.getByTestId(`containment-tree-element-menu-rename-${rootId()}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-delete-${rootId()}`,
        ),
      ).toBeNull();
    });

    it('Create child submenu lists kinds accepted by the row element', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!; // PartDefinition

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-create-child-${a}`),
      );

      const list = screen.getByTestId(
        `containment-tree-element-menu-create-child-list-${a}`,
      );
      expect(list).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-create-PortDefinition-port-${a}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-create-ValueProperty-property-${a}`,
        ),
      ).toBeInTheDocument();
    });

    it('Create child submenu is not offered for kinds with no accepted children', async () => {
      await bootstrap();
      // A Requirement has no free-standing tree children.
      const reqId = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Requirement', 'member', 'R1');
      expect(reqId).not.toBeNull();

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${reqId}`),
      );
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-create-child-${reqId}`,
        ),
      ).toBeNull();
    });

    it('Create-child on the project root (Package) appends a child of the chosen kind', async () => {
      await bootstrap();
      const before = useWorkspaceStore
        .getState()
        .elements.filter((e) => e.ownerId === rootId()).length;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-child-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-PartDefinition-member-${rootId()}`,
        ),
      );

      await waitFor(() => {
        const after = useWorkspaceStore
          .getState()
          .elements.filter(
            (e) => e.ownerId === rootId() && e.kind === 'PartDefinition',
          ).length;
        expect(after).toBe(before + 1);
      });
    });

    it('Create-child selects the new element and opens inline rename', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-child-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-Requirement-member-${rootId()}`,
        ),
      );

      await waitFor(() => {
        const sel = useWorkspaceStore.getState().selectedElementIds;
        expect(sel).toHaveLength(1);
      });
      const newId = useWorkspaceStore.getState().selectedElementIds[0]!;
      expect(
        await screen.findByTestId(
          `containment-tree-element-rename-${newId}`,
        ),
      ).toBeInTheDocument();
    });

    it('Create-child on PartDefinition with ownerRole=port creates a PortDefinition under it', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-create-child-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-PortDefinition-port-${part}`,
        ),
      );

      await waitFor(() => {
        const ports = useWorkspaceStore
          .getState()
          .elements.filter(
            (e) =>
              e.kind === 'PortDefinition' &&
              e.ownerId === part &&
              e.ownerRole === 'port',
          );
        expect(ports).toHaveLength(1);
      });
    });

    it('Create-child on a collapsed parent auto-expands it', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      const caret = screen.getByTestId(
        `containment-tree-element-disclosure-${rootId()}`,
      );
      fireEvent.click(caret);
      const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
      expect(root).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-child-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-Actor-member-${rootId()}`,
        ),
      );

      await waitFor(() => {
        expect(root).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('createChildElement (T-13.33b store action)', () => {
    it('builds an InterfaceDefinition with ownerRole=portDefinition for nested ports', async () => {
      await bootstrap();
      const iface = useWorkspaceStore
        .getState()
        .createChildElement(
          rootId(),
          'InterfaceDefinition',
          'member',
          'My Interface',
        );
      expect(iface).not.toBeNull();

      const port = useWorkspaceStore
        .getState()
        .createChildElement(iface!, 'PortDefinition', 'portDefinition', 'p1');
      expect(port).not.toBeNull();

      const pe = useWorkspaceStore.getState().elements.find((e) => e.id === port);
      expect(pe?.kind).toBe('PortDefinition');
      expect(pe?.ownerId).toBe(iface);
      expect(pe?.ownerRole).toBe('portDefinition');
    });

    it('returns null when the owner does not exist', async () => {
      await bootstrap();
      const ghost = 'el-does-not-exist' as unknown as ElementId;
      expect(
        useWorkspaceStore
          .getState()
          .createChildElement(ghost, 'Package', 'member', 'X'),
      ).toBeNull();
    });

    it('assigns sequential ownerIndex within (ownerId, ownerRole)', async () => {
      await bootstrap();
      const a = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'a')!;
      const b = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'b')!;
      const ea = useWorkspaceStore.getState().elements.find((e) => e.id === a)!;
      const eb = useWorkspaceStore.getState().elements.find((e) => e.id === b)!;
      expect(eb.ownerIndex).toBe(ea.ownerIndex + 1);
    });

    it('Requirement defaults populate text, priority, status, reqId', async () => {
      await bootstrap();
      const r = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Requirement', 'member', 'R')!;
      const e = useWorkspaceStore
        .getState()
        .elements.find((x) => x.id === r);
      expect(e?.kind).toBe('Requirement');
      if (e?.kind === 'Requirement') {
        expect(e.text).toBe('');
        expect(e.priority).toBe('medium');
        expect(e.status).toBe('draft');
        expect(e.reqId).toMatch(/^R-\d{3}$/);
      }
    });
  });

  describe('Create representation submenu (T-13.33c)', () => {
    it('PartDefinition row offers BDD, IBD, Parametric', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-${part}`,
        ),
      );
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-list-${part}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-representation-bdd-${part}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-representation-ibd-${part}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-representation-parametric-${part}`,
        ),
      ).toBeInTheDocument();
    });

    it('the Create representation submenu is hidden for kinds with no accepted viewpoints', async () => {
      await bootstrap();
      const reqId = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Requirement', 'member', 'R')!;
      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${reqId}`),
      );
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-create-representation-${reqId}`,
        ),
      ).toBeNull();
    });

    it('selecting a viewpoint creates a new Diagram anchored to the row element and activates it', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(part, 'Pump');
      });
      const before = useWorkspaceStore.getState().diagrams.length;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-${part}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-representation-ibd-${part}`,
        ),
      );

      await waitFor(() => {
        expect(useWorkspaceStore.getState().diagrams.length).toBe(before + 1);
      });
      const added = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.context?.id === part)!;
      expect(added.viewpointId).toBe('ibd');
      expect(added.context).toEqual({ kind: 'partDefinition', id: part });
      expect(added.name).toBe('Pump IBD');
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(added.id);
    });

    it('the new representation appears as a child row nested under its owner', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-${part}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-representation-bdd-${part}`,
        ),
      );

      await waitFor(() => {
        const dg = useWorkspaceStore
          .getState()
          .diagrams.find((d) => d.context?.id === part);
        expect(dg).toBeDefined();
        expect(
          screen.getByTestId(`containment-tree-diagram-${dg!.id}`),
        ).toBeInTheDocument();
      });
    });

    it('ActionDefinition offers exactly the Activity viewpoint', async () => {
      await bootstrap();
      const ad = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'ActionDefinition', 'member', 'Pump.run')!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${ad}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-${ad}`,
        ),
      );
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-representation-activity-${ad}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-representation-bdd-${ad}`,
        ),
      ).toBeNull();
    });

    it('Package root offers BDD, Requirements, Use Case, Package', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-create-representation-${rootId()}`,
        ),
      );
      for (const vp of ['bdd', 'requirements', 'use-case', 'package']) {
        expect(
          screen.getByTestId(
            `containment-tree-element-menu-representation-${vp}-${rootId()}`,
          ),
        ).toBeInTheDocument();
      }
    });
  });

  describe('diagram-row menu (T-13.33d)', () => {
    it('renders a kebab trigger on each diagram row', async () => {
      await bootstrap();
      const dId = useWorkspaceStore.getState().diagrams[0]!.id;

      render(<ContainmentTree />);
      expect(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${dId}`),
      ).toBeInTheDocument();
    });

    it('Rename action puts the diagram name into edit mode; Enter commits via the store', async () => {
      await bootstrap();
      const dId = useWorkspaceStore.getState().diagrams[0]!.id;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${dId}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-rename-${dId}`),
      );

      const input = await screen.findByTestId(
        `containment-tree-diagram-rename-${dId}`,
      );
      fireEvent.change(input, { target: { value: 'Renamed Diagram' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        const dg = useWorkspaceStore
          .getState()
          .diagrams.find((d) => d.id === dId);
        expect(dg?.name).toBe('Renamed Diagram');
      });
    });

    it('Rename Escape cancels without mutating the diagram name', async () => {
      await bootstrap();
      const dId = useWorkspaceStore.getState().diagrams[0]!.id;
      const original = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === dId)!.name;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${dId}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-rename-${dId}`),
      );

      const input = await screen.findByTestId(
        `containment-tree-diagram-rename-${dId}`,
      );
      fireEvent.change(input, { target: { value: 'Discarded' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      const dg = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === dId);
      expect(dg?.name).toBe(original);
      expect(
        screen.queryByTestId(`containment-tree-diagram-rename-${dId}`),
      ).toBeNull();
    });

    it('Delete on the active diagram removes it and falls back to another diagram', async () => {
      await bootstrap();
      const first = useWorkspaceStore.getState().diagrams[0]!.id;
      const viewpointId = useWorkspaceStore.getState().viewpoints.list()[0]!.id;
      const second = useWorkspaceStore
        .getState()
        .createDiagram(viewpointId, { name: 'Second' })!;
      act(() => {
        useWorkspaceStore.getState().setActiveDiagram(first);
      });
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(first);

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${first}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-delete-${first}`),
      );

      await waitFor(() => {
        const state = useWorkspaceStore.getState();
        expect(state.diagrams.find((d) => d.id === first)).toBeUndefined();
        expect(state.activeDiagramId).toBe(second);
      });
    });

    it('Delete on a non-active diagram leaves the active diagram untouched', async () => {
      await bootstrap();
      const first = useWorkspaceStore.getState().diagrams[0]!.id;
      const viewpointId = useWorkspaceStore.getState().viewpoints.list()[0]!.id;
      const second = useWorkspaceStore
        .getState()
        .createDiagram(viewpointId, { name: 'Second' })!;
      act(() => {
        useWorkspaceStore.getState().setActiveDiagram(first);
      });

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${second}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-delete-${second}`),
      );

      await waitFor(() => {
        const state = useWorkspaceStore.getState();
        expect(state.diagrams.find((d) => d.id === second)).toBeUndefined();
        expect(state.activeDiagramId).toBe(first);
      });
    });

    it('Delete of the last remaining diagram clears activeDiagramId', async () => {
      await bootstrap();
      const only = useWorkspaceStore.getState().diagrams[0]!.id;
      expect(useWorkspaceStore.getState().diagrams).toHaveLength(1);

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${only}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-delete-${only}`),
      );

      await waitFor(() => {
        const state = useWorkspaceStore.getState();
        expect(state.diagrams).toHaveLength(0);
        expect(state.activeDiagramId).toBeNull();
      });
    });

    it('clicking the kebab opens the menu and does not activate the diagram', async () => {
      await bootstrap();
      const first = useWorkspaceStore.getState().diagrams[0]!.id;
      const viewpointId = useWorkspaceStore.getState().viewpoints.list()[0]!.id;
      const second = useWorkspaceStore
        .getState()
        .createDiagram(viewpointId, { name: 'Second' })!;
      act(() => {
        useWorkspaceStore.getState().setActiveDiagram(first);
      });

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-diagram-menu-trigger-${second}`),
      );
      expect(
        screen.getByTestId(`containment-tree-diagram-menu-${second}`),
      ).toBeInTheDocument();
      expect(useWorkspaceStore.getState().activeDiagramId).toBe(first);
    });
  });

  describe('renameDiagram / deleteDiagram (T-13.33d store actions)', () => {
    it('renameDiagram updates the diagram name', async () => {
      await bootstrap();
      const dId = useWorkspaceStore.getState().diagrams[0]!.id;
      act(() => {
        useWorkspaceStore.getState().renameDiagram(dId, '  New Name  ');
      });
      const dg = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === dId);
      expect(dg?.name).toBe('New Name');
    });

    it('renameDiagram is a no-op for empty/whitespace names', async () => {
      await bootstrap();
      const dId = useWorkspaceStore.getState().diagrams[0]!.id;
      const before = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === dId)!.name;
      act(() => {
        useWorkspaceStore.getState().renameDiagram(dId, '   ');
      });
      const after = useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.id === dId)!.name;
      expect(after).toBe(before);
    });

    it('deleteDiagram clears secondaryDiagramId if it referenced the deleted diagram', async () => {
      await bootstrap();
      const first = useWorkspaceStore.getState().diagrams[0]!.id;
      const viewpointId = useWorkspaceStore.getState().viewpoints.list()[0]!.id;
      const second = useWorkspaceStore
        .getState()
        .createDiagram(viewpointId, { name: 'Second' })!;
      act(() => {
        useWorkspaceStore.getState().setActiveDiagram(first);
        useWorkspaceStore.getState().splitDiagram(second);
      });
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBe(second);

      act(() => {
        useWorkspaceStore.getState().deleteDiagram(second);
      });
      const state = useWorkspaceStore.getState();
      expect(state.diagrams.find((d) => d.id === second)).toBeUndefined();
      expect(state.secondaryDiagramId).toBeNull();
    });
  });

  describe('legacy: menu closes on outside pointerdown', () => {
    it('menu closes on outside pointerdown', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      await waitFor(() => {
        expect(
          screen.queryByTestId(`containment-tree-element-menu-${a}`),
        ).toBeNull();
      });
    });
  });

  describe('filter bar (T-13.35)', () => {
    it('renders the filter input above the tree', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      expect(screen.getByTestId('containment-tree-filter')).toBeInTheDocument();
    });

    it('hides non-matching rows and keeps matches + ancestors', async () => {
      await bootstrap();
      const pump = useWorkspaceStore.getState().createBlock()!;
      const vessel = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(pump, 'Pump');
        useWorkspaceStore.getState().renameElement(vessel, 'Vessel');
      });

      render(<ContainmentTree />);
      const input = screen.getByTestId('containment-tree-filter');
      fireEvent.change(input, { target: { value: 'pump' } });

      expect(
        screen.getByTestId(`containment-tree-element-${pump}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`containment-tree-element-${vessel}`),
      ).toBeNull();
      // Root must still be visible as the ancestor of the match.
      expect(
        screen.getByTestId(`containment-tree-element-${rootId()}`),
      ).toBeInTheDocument();
    });

    it('matches against element kind', async () => {
      await bootstrap();
      const pump = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(pump, 'Zeta');
      });

      render(<ContainmentTree />);
      fireEvent.change(screen.getByTestId('containment-tree-filter'), {
        target: { value: 'partdefinition' },
      });
      expect(
        screen.getByTestId(`containment-tree-element-${pump}`),
      ).toBeInTheDocument();
    });

    it('matches against diagram name', async () => {
      await bootstrap();
      const diagramId = useWorkspaceStore.getState().diagrams[0]!.id;
      act(() => {
        useWorkspaceStore.getState().renameDiagram(diagramId, 'Engine Behaviour');
      });

      render(<ContainmentTree />);
      fireEvent.change(screen.getByTestId('containment-tree-filter'), {
        target: { value: 'engine' },
      });
      expect(
        screen.getByTestId(`containment-tree-diagram-${diagramId}`),
      ).toBeInTheDocument();
    });

    it('uses AND semantics across tokens', async () => {
      await bootstrap();
      const pump = useWorkspaceStore.getState().createBlock()!;
      const enginePump = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(pump, 'Pump');
        useWorkspaceStore.getState().renameElement(enginePump, 'Engine Pump');
      });

      render(<ContainmentTree />);
      fireEvent.change(screen.getByTestId('containment-tree-filter'), {
        target: { value: 'engine pump' },
      });
      expect(
        screen.getByTestId(`containment-tree-element-${enginePump}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`containment-tree-element-${pump}`),
      ).toBeNull();
    });

    it('force-expands ancestors even if the user had collapsed them', async () => {
      await bootstrap();
      const pump = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(pump, 'Pump');
      });

      render(<ContainmentTree />);
      // Collapse the root before applying the filter.
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-disclosure-${rootId()}`),
      );
      expect(
        screen.queryByTestId(`containment-tree-element-${pump}`),
      ).toBeNull();

      fireEvent.change(screen.getByTestId('containment-tree-filter'), {
        target: { value: 'pump' },
      });
      // Filter overrides the collapse and surfaces Pump.
      expect(
        screen.getByTestId(`containment-tree-element-${pump}`),
      ).toBeInTheDocument();
    });

    it('shows a no-matches message when nothing matches', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      fireEvent.change(screen.getByTestId('containment-tree-filter'), {
        target: { value: 'zzzzz-not-in-tree' },
      });
      expect(
        screen.getByTestId('containment-tree-no-matches'),
      ).toBeInTheDocument();
    });

    it('empty filter restores the unfiltered tree', async () => {
      await bootstrap();
      const pump = useWorkspaceStore.getState().createBlock()!;
      const vessel = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(pump, 'Pump');
        useWorkspaceStore.getState().renameElement(vessel, 'Vessel');
      });

      render(<ContainmentTree />);
      const input = screen.getByTestId('containment-tree-filter');
      fireEvent.change(input, { target: { value: 'pump' } });
      expect(
        screen.queryByTestId(`containment-tree-element-${vessel}`),
      ).toBeNull();
      fireEvent.change(input, { target: { value: '' } });
      expect(
        screen.getByTestId(`containment-tree-element-${vessel}`),
      ).toBeInTheDocument();
    });
  });

  describe('drag-and-drop move (T-13.36b)', () => {
    function makeDataTransfer(): DataTransfer {
      const map = new Map<string, string>();
      const types: string[] = [];
      return {
        setData: (type: string, val: string) => {
          if (!map.has(type)) types.push(type);
          map.set(type, val);
        },
        getData: (type: string) => map.get(type) ?? '',
        setDragImage: () => {},
        effectAllowed: 'none' as DataTransfer['effectAllowed'],
        dropEffect: 'none' as DataTransfer['dropEffect'],
        types: types as unknown as readonly string[],
      } as unknown as DataTransfer;
    }

    it('element rows are draggable and emit the element id under PROJECT_TREE_DRAG_ELEMENT_ID', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      render(<ContainmentTree />);
      const row = screen.getByTestId(`containment-tree-element-${a}`);
      expect(row).toHaveAttribute('draggable', 'true');
      const dt = makeDataTransfer();
      fireEvent.dragStart(row, { dataTransfer: dt });
      expect(dt.getData(PROJECT_TREE_DRAG_ELEMENT_ID)).toBe(a);
      expect(dt.effectAllowed).toBe('move');
    });

    it('the project root row is not draggable', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      const root = screen.getByTestId(`containment-tree-element-${rootId()}`);
      expect(root).not.toHaveAttribute('draggable', 'true');
    });

    it('dragOver on an accepted target calls preventDefault and marks data-droptarget', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const port = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'PortDefinition', 'member', 'P1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${port}`);
      const target = screen.getByTestId(`containment-tree-element-${part}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      const ev = createEvent.dragOver(target, { dataTransfer: dt });
      fireEvent(target, ev);
      expect(ev.defaultPrevented).toBe(true);
      expect(target).toHaveAttribute('data-droptarget', 'true');
    });

    it('dragOver on a non-accepting target does not call preventDefault', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const req = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Requirement', 'member', 'R1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${part}`);
      const target = screen.getByTestId(`containment-tree-element-${req}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      const ev = createEvent.dragOver(target, { dataTransfer: dt });
      fireEvent(target, ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(target).not.toHaveAttribute('data-droptarget', 'true');
    });

    it('drop on accepted target moves the element via the store (PortDefinition → PartDefinition, ownerRole=port)', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const port = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'PortDefinition', 'member', 'P1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${port}`);
      const target = screen.getByTestId(`containment-tree-element-${part}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      fireEvent.dragOver(target, { dataTransfer: dt });
      fireEvent.drop(target, { dataTransfer: dt });
      await waitFor(() => {
        const e = useWorkspaceStore
          .getState()
          .elements.find((el) => el.id === port);
        expect(e?.ownerId).toBe(part);
        expect(e?.ownerRole).toBe('port');
      });
    });

    it('drop on ActionDefinition with a ValueProperty source sets ownerRole=parameter', async () => {
      await bootstrap();
      const action = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'ActionDefinition', 'member', 'Pump.run')!;
      const value = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'ValueProperty', 'member', 'speed')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${value}`);
      const target = screen.getByTestId(`containment-tree-element-${action}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      fireEvent.drop(target, { dataTransfer: dt });
      await waitFor(() => {
        const e = useWorkspaceStore
          .getState()
          .elements.find((el) => el.id === value);
        expect(e?.ownerId).toBe(action);
        expect(e?.ownerRole).toBe('parameter');
      });
    });

    it('drop on the project root row moves a nested element back to ownerRole=member', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const port = useWorkspaceStore
        .getState()
        .createChildElement(part, 'PortDefinition', 'port', 'P1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${port}`);
      const target = screen.getByTestId(`containment-tree-element-${rootId()}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      fireEvent.drop(target, { dataTransfer: dt });
      await waitFor(() => {
        const e = useWorkspaceStore
          .getState()
          .elements.find((el) => el.id === port);
        expect(e?.ownerId).toBe(rootId());
        expect(e?.ownerRole).toBe('member');
      });
    });

    it('drop on self is a no-op (ownerId unchanged)', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const before = useWorkspaceStore
        .getState()
        .elements.find((e) => e.id === part);
      render(<ContainmentTree />);
      const row = screen.getByTestId(`containment-tree-element-${part}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(row, { dataTransfer: dt });
      fireEvent.drop(row, { dataTransfer: dt });
      const after = useWorkspaceStore
        .getState()
        .elements.find((e) => e.id === part);
      expect(after?.ownerId).toBe(before?.ownerId);
      expect(after?.ownerRole).toBe(before?.ownerRole);
    });

    it('drop onto a descendant (cycle) is rejected without preventDefault and ownership stays put', async () => {
      await bootstrap();
      const outer = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Outer')!;
      const inner = useWorkspaceStore
        .getState()
        .createChildElement(outer, 'Package', 'member', 'Inner')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${outer}`);
      const target = screen.getByTestId(`containment-tree-element-${inner}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      const ev = createEvent.dragOver(target, { dataTransfer: dt });
      fireEvent(target, ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(target).not.toHaveAttribute('data-droptarget', 'true');
      fireEvent.drop(target, { dataTransfer: dt });
      const e = useWorkspaceStore
        .getState()
        .elements.find((el) => el.id === outer);
      expect(e?.ownerId).toBe(rootId());
    });

    it('diagram rows do not become drop targets', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const diagramId = useWorkspaceStore.getState().diagrams[0]!.id;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${part}`);
      const target = screen.getByTestId(`containment-tree-diagram-${diagramId}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      const ev = createEvent.dragOver(target, { dataTransfer: dt });
      fireEvent(target, ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(target).not.toHaveAttribute('data-droptarget', 'true');
    });

    it('dragEnd clears the active drop-target indicator', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const port = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'PortDefinition', 'member', 'P1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${port}`);
      const target = screen.getByTestId(`containment-tree-element-${part}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      fireEvent.dragOver(target, { dataTransfer: dt });
      expect(target).toHaveAttribute('data-droptarget', 'true');
      fireEvent.dragEnd(source, { dataTransfer: dt });
      await waitFor(() => {
        expect(target).not.toHaveAttribute('data-droptarget', 'true');
      });
    });

    it('drop undoes in a single step (one command-bus event)', async () => {
      await bootstrap();
      const part = useWorkspaceStore.getState().createBlock()!;
      const port = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'PortDefinition', 'member', 'P1')!;
      render(<ContainmentTree />);
      const source = screen.getByTestId(`containment-tree-element-${port}`);
      const target = screen.getByTestId(`containment-tree-element-${part}`);
      const dt = makeDataTransfer();
      fireEvent.dragStart(source, { dataTransfer: dt });
      fireEvent.drop(target, { dataTransfer: dt });
      await waitFor(() => {
        const e = useWorkspaceStore
          .getState()
          .elements.find((el) => el.id === port);
        expect(e?.ownerId).toBe(part);
      });
      act(() => {
        useWorkspaceStore.getState().undo();
      });
      const after = useWorkspaceStore
        .getState()
        .elements.find((e) => e.id === port);
      expect(after?.ownerId).toBe(rootId());
      expect(after?.ownerRole).toBe('member');
    });
  });

  describe('Duplicate + Move to package (T-13.33e-b)', () => {
    it('Duplicate dispatches duplicateElement and queues a pending rename on the clone', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(a, 'Pump');
      });

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-duplicate-${a}`),
      );

      await waitFor(() => {
        // T-14.04 vendors KerML PartDefinitions in `elements` — filter out
        // library elements when counting user-authored parts.
        const s = useWorkspaceStore.getState();
        const libRoots = s.project?.libraryRootIds;
        const userParts = s.elements.filter(
          (e) =>
            e.kind === 'PartDefinition' &&
            !isLibraryElement(e, libRoots, s.elements),
        );
        expect(userParts).toHaveLength(2);
      });
      const s2 = useWorkspaceStore.getState();
      const libRoots = s2.project?.libraryRootIds;
      const clone = s2.elements.find(
        (e) =>
          e.kind === 'PartDefinition' &&
          e.id !== a &&
          !isLibraryElement(e, libRoots, s2.elements),
      )!;
      expect(clone.name).toBe('Pump copy');
      expect(
        await screen.findByTestId(
          `containment-tree-element-rename-${clone.id}`,
        ),
      ).toBeInTheDocument();
    });

    it('Duplicate is hidden on the project root', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-duplicate-${rootId()}`,
        ),
      ).toBeNull();
    });

    it('Move to package… is hidden on the project root', async () => {
      await bootstrap();
      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-trigger-${rootId()}`,
        ),
      );
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-move-to-package-${rootId()}`,
        ),
      ).toBeNull();
    });

    it('Move to package… opens the picker listing every Package except the current owner', async () => {
      await bootstrap();
      const sub = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Sub')!;
      const part = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-package-${part}`,
        ),
      );

      expect(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-package-list-${part}`,
        ),
      ).toBeInTheDocument();
      // "Sub" is listed; root (current owner) is not.
      expect(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-${sub}-${part}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          `containment-tree-element-menu-move-to-${rootId()}-${part}`,
        ),
      ).toBeNull();
    });

    it('Move to package… is disabled when no Package would accept this kind', async () => {
      await bootstrap();
      // ValueProperty is not in acceptedChildKinds('Package').
      const part = useWorkspaceStore.getState().createBlock()!;
      const vp = useWorkspaceStore
        .getState()
        .createChildElement(part, 'ValueProperty', 'property', 'v')!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${vp}`),
      );
      const trigger = screen.queryByTestId(
        `containment-tree-element-menu-move-to-package-${vp}`,
      );
      // A ValueProperty has the root Package available as a target candidate,
      // but the trigger is disabled because the Package does not accept
      // ValueProperty as a child.
      expect(trigger).not.toBeNull();
      expect(trigger).toBeDisabled();
    });

    it('picker disables descendant Packages with cycle reason', async () => {
      await bootstrap();
      const outer = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Outer')!;
      const inner = useWorkspaceStore
        .getState()
        .createChildElement(outer, 'Package', 'member', 'Inner')!;
      // Sibling Package exists so the trigger is enabled and the picker opens.
      useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Sibling');

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${outer}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-package-${outer}`,
        ),
      );
      const innerButton = screen.getByTestId(
        `containment-tree-element-menu-move-to-${inner}-${outer}`,
      );
      expect(innerButton).toBeDisabled();
      expect(innerButton).toHaveAttribute('data-disabled-reason', 'cycle');
    });

    it('clicking a valid target dispatches moveElement and reparents the element', async () => {
      await bootstrap();
      const sub = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Sub')!;
      const part = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${part}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-package-${part}`,
        ),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-${sub}-${part}`,
        ),
      );

      await waitFor(() => {
        const moved = useWorkspaceStore
          .getState()
          .elements.find((e) => e.id === part);
        expect(moved?.ownerId).toBe(sub);
        expect(moved?.ownerRole).toBe('member');
      });
    });

    it('clicking a disabled target is a no-op (does not dispatch moveElement)', async () => {
      await bootstrap();
      const outer = useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Outer')!;
      const inner = useWorkspaceStore
        .getState()
        .createChildElement(outer, 'Package', 'member', 'Inner')!;
      useWorkspaceStore
        .getState()
        .createChildElement(rootId(), 'Package', 'member', 'Sibling');

      render(<ContainmentTree />);
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${outer}`),
      );
      fireEvent.click(
        screen.getByTestId(
          `containment-tree-element-menu-move-to-package-${outer}`,
        ),
      );
      const innerButton = screen.getByTestId(
        `containment-tree-element-menu-move-to-${inner}-${outer}`,
      );
      fireEvent.click(innerButton);

      const after = useWorkspaceStore
        .getState()
        .elements.find((e) => e.id === outer);
      expect(after?.ownerId).toBe(rootId());
    });
  });

  describe('right-click context menu (T-13.02)', () => {
    it('right-clicking an element row opens its row menu and suppresses the native menu', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      const row = screen.getByTestId(`containment-tree-element-${a}`);
      expect(
        screen.queryByTestId(`containment-tree-element-menu-${a}`),
      ).toBeNull();

      const event = createEvent.contextMenu(row);
      const prevented = !fireEvent(row, event);
      expect(prevented).toBe(true);

      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();
    });

    it('right-clicking does not also activate / select the row', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      // Pre-condition: row a is not selected.
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);

      render(<ContainmentTree />);
      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${a}`));

      // Right-click must open the menu without invoking the row's onClick
      // selection path (right-click does not fire a click event).
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
    });

    it('right-clicking a diagram row opens its row menu and suppresses the native menu', async () => {
      await bootstrap();
      const diagramId = useWorkspaceStore.getState().diagrams[0]!.id;

      render(<ContainmentTree />);
      const row = screen.getByTestId(`containment-tree-diagram-${diagramId}`);
      expect(
        screen.queryByTestId(`containment-tree-diagram-menu-${diagramId}`),
      ).toBeNull();

      const event = createEvent.contextMenu(row);
      const prevented = !fireEvent(row, event);
      expect(prevented).toBe(true);

      expect(
        screen.getByTestId(`containment-tree-diagram-menu-${diagramId}`),
      ).toBeInTheDocument();
    });

    it('Escape closes a right-click-opened element-row menu', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${a}`));
      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(
          screen.queryByTestId(`containment-tree-element-menu-${a}`),
        ).toBeNull();
      });
    });

    it('outside pointerdown closes a right-click-opened element-row menu', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${a}`));
      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      await waitFor(() => {
        expect(
          screen.queryByTestId(`containment-tree-element-menu-${a}`),
        ).toBeNull();
      });
    });

    it('right-clicking a different element row swaps which menu is open', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      const b = useWorkspaceStore.getState().createBlock()!;

      render(<ContainmentTree />);
      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${a}`));
      expect(
        screen.getByTestId(`containment-tree-element-menu-${a}`),
      ).toBeInTheDocument();

      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${b}`));
      // After right-clicking b, a's menu has closed via the document
      // pointerdown handler, and b's menu is now open.
      await waitFor(() => {
        expect(
          screen.queryByTestId(`containment-tree-element-menu-${a}`),
        ).toBeNull();
      });
      expect(
        screen.getByTestId(`containment-tree-element-menu-${b}`),
      ).toBeInTheDocument();
    });

    it('right-click-opened menu items still trigger their action', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(a, 'Pump');
      });

      render(<ContainmentTree />);
      fireEvent.contextMenu(screen.getByTestId(`containment-tree-element-${a}`));
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-delete-${a}`),
      );

      expect(
        useWorkspaceStore.getState().elements.find((e) => e.id === a),
      ).toBeUndefined();
    });

    it('does not open the menu when right-clicking a row in rename mode', async () => {
      await bootstrap();
      const a = useWorkspaceStore.getState().createBlock()!;
      act(() => {
        useWorkspaceStore.getState().renameElement(a, 'Pump');
      });

      render(<ContainmentTree />);
      // Enter rename mode via the kebab → Rename path.
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-trigger-${a}`),
      );
      fireEvent.click(
        screen.getByTestId(`containment-tree-element-menu-rename-${a}`),
      );
      // Rename input is visible; the row is in rename mode.
      expect(
        screen.getByTestId(`containment-tree-element-rename-${a}`),
      ).toBeInTheDocument();

      // Right-clicking the row while renaming must NOT pop the context menu
      // (the kebab disappears too while renaming).
      const row = screen.getByTestId(`containment-tree-element-${a}`);
      const event = createEvent.contextMenu(row);
      fireEvent(row, event);
      expect(
        screen.queryByTestId(`containment-tree-element-menu-${a}`),
      ).toBeNull();
    });
  });
});
