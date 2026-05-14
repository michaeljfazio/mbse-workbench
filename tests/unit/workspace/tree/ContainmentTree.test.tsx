import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

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

function rootId(): string {
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
});
