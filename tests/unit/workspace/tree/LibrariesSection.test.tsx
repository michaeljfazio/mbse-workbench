import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import {
  type ElementId,
  type ModelElement,
  type PackageElement,
  type PartDefinitionElement,
  createElementId,
} from '@/model';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { LibrariesSection } from '@/workspace/tree/LibrariesSection';
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

function mkLibPackage(name: string): PackageElement {
  return {
    id: createElementId(),
    kind: 'Package',
    name,
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    isReadOnly: true,
  };
}

function mkPart(name: string, ownerId: ElementId, ownerIndex = 0): PartDefinitionElement {
  return {
    id: createElementId(),
    kind: 'PartDefinition',
    name,
    ownerId,
    ownerRole: 'member',
    ownerIndex,
    isAbstract: false,
  };
}

function seedLibraries(libs: readonly { root: PackageElement; children?: readonly ModelElement[] }[]): void {
  const state = useWorkspaceStore.getState();
  const project = state.project;
  if (!project) throw new Error('no project loaded');
  const extraElements: ModelElement[] = [];
  const ids: ElementId[] = [];
  for (const { root, children } of libs) {
    extraElements.push(root);
    if (children) extraElements.push(...children);
    ids.push(root.id);
  }
  useWorkspaceStore.setState({
    project: { ...project, libraryRootIds: ids },
    elements: [...state.elements, ...extraElements],
  });
}

describe('<LibrariesSection />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders nothing when project has no libraryRootIds', async () => {
    await bootstrap();
    // T-14.04 seeds KerML core into every bootstrapped project; explicitly
    // clear libraryRootIds (and drop library elements) to isolate this test.
    const project = useWorkspaceStore.getState().project!;
    act(() => {
      useWorkspaceStore.setState({
        project: { ...project, libraryRootIds: undefined },
      });
    });
    const { container } = render(<LibrariesSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when libraryRootIds is empty', async () => {
    await bootstrap();
    const project = useWorkspaceStore.getState().project!;
    act(() => {
      useWorkspaceStore.setState({ project: { ...project, libraryRootIds: [] } });
    });
    const { container } = render(<LibrariesSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when libraryRootIds references missing elements', async () => {
    await bootstrap();
    const project = useWorkspaceStore.getState().project!;
    act(() => {
      useWorkspaceStore.setState({
        project: { ...project, libraryRootIds: [createElementId()] },
      });
    });
    const { container } = render(<LibrariesSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the Libraries header and a row per library root', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    const sysml = mkLibPackage('SysML');
    act(() => seedLibraries([{ root: kerml }, { root: sysml }]));

    render(<LibrariesSection />);
    expect(screen.getByTestId('libraries-section')).toBeInTheDocument();
    expect(screen.getByTestId('libraries-section-header')).toHaveTextContent(/libraries/i);
    expect(screen.getByTestId(`libraries-tree-element-${kerml.id}`)).toHaveTextContent('KerML');
    expect(screen.getByTestId(`libraries-tree-element-${sysml.id}`)).toHaveTextContent('SysML');
  });

  it('shows a lock badge on each library root row', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    act(() => seedLibraries([{ root: kerml }]));

    render(<LibrariesSection />);
    const row = screen.getByTestId(`libraries-tree-element-${kerml.id}`);
    const lock = row.querySelector('[data-testid="libraries-lock-badge"]');
    expect(lock).not.toBeNull();
  });

  it('shows a lock badge on descendants of a library root', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    const part = mkPart('Anything', kerml.id);
    act(() => seedLibraries([{ root: kerml, children: [part] }]));

    render(<LibrariesSection />);
    // Library roots start collapsed (T-14.04 follow-up: avoids tree
    // clutter when KerML core auto-merges). Expand the root to see the
    // descendant row.
    fireEvent.click(screen.getByTestId(`libraries-tree-disclosure-${kerml.id}`));
    const descendant = screen.getByTestId(`libraries-tree-element-${part.id}`);
    expect(descendant.querySelector('[data-testid="libraries-lock-badge"]')).not.toBeNull();
  });

  it('renders no row context menu or rename/delete affordances', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    const part = mkPart('Anything', kerml.id);
    act(() => seedLibraries([{ root: kerml, children: [part] }]));

    render(<LibrariesSection />);
    const row = screen.getByTestId(`libraries-tree-element-${kerml.id}`);
    expect(row.querySelector('button[aria-haspopup="menu"]')).toBeNull();
    expect(row.getAttribute('draggable')).not.toBe('true');
  });

  it('expands and collapses a library subtree via the disclosure caret', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    const part = mkPart('Anything', kerml.id);
    act(() => seedLibraries([{ root: kerml, children: [part] }]));

    render(<LibrariesSection />);
    const rootRow = screen.getByTestId(`libraries-tree-element-${kerml.id}`);
    // Default-collapsed: descendants are not in the tree until the user
    // expands the root.
    expect(rootRow).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`libraries-tree-element-${part.id}`)).toBeNull();

    const caret = screen.getByTestId(`libraries-tree-disclosure-${kerml.id}`);
    fireEvent.click(caret);
    expect(rootRow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(`libraries-tree-element-${part.id}`)).toBeInTheDocument();

    fireEvent.click(caret);
    expect(rootRow).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`libraries-tree-element-${part.id}`)).toBeNull();
  });

  it('clicking a library row selects the element in the workspace store', async () => {
    await bootstrap();
    const kerml = mkLibPackage('KerML');
    const part = mkPart('Anything', kerml.id);
    act(() => seedLibraries([{ root: kerml, children: [part] }]));

    render(<LibrariesSection />);
    fireEvent.click(screen.getByTestId(`libraries-tree-disclosure-${kerml.id}`));
    fireEvent.click(screen.getByTestId(`libraries-tree-element-${part.id}`));
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([part.id]);
  });
});
