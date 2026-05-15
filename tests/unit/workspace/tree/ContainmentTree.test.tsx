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
});
