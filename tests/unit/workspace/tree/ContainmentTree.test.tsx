import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ElementId } from '@/model';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { ContainmentTree } from '@/workspace/tree/ContainmentTree';
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
});
