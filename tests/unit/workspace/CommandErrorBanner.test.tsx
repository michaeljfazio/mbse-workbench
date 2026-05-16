import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { LibraryViolationError } from '@/commands';
import {
  createElementId,
  type ElementId,
  type PackageElement,
  type PartDefinitionElement,
} from '@/model';
import { CommandErrorBanner } from '@/workspace/CommandErrorBanner';
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

describe('<CommandErrorBanner />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders nothing when commandError is null', () => {
    const { container } = render(<CommandErrorBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the error message when commandError is set', () => {
    act(() => {
      useWorkspaceStore.setState({
        commandError: { message: 'Cannot modify read-only library element' },
      });
    });
    render(<CommandErrorBanner />);
    const banner = screen.getByTestId('command-error-banner');
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(
      screen.getByTestId('command-error-banner-text').textContent,
    ).toMatch(/Cannot modify read-only library element/);
  });

  it('clears commandError when Dismiss is clicked', () => {
    act(() => {
      useWorkspaceStore.setState({
        commandError: { message: 'Cannot modify read-only library element' },
      });
    });
    render(<CommandErrorBanner />);
    fireEvent.click(screen.getByTestId('command-error-banner-dismiss'));
    expect(useWorkspaceStore.getState().commandError).toBeNull();
  });

  it('end-to-end: dispatching a destructive command against a read-only Package surfaces the banner', async () => {
    await bootstrap();

    // Insert a read-only Package + child element directly into the registry,
    // then dispatch an update against the child through the bus. The bus's
    // onError callback (wired in bootstrap) sets commandError.
    const state = useWorkspaceStore.getState();
    const registry = state.registry;
    const bus = state.bus;
    if (!registry || !bus) throw new Error('bootstrap did not wire bus/registry');

    const libId: ElementId = createElementId();
    const childId: ElementId = createElementId();
    const lib: PackageElement = {
      id: libId,
      kind: 'Package',
      name: 'KerML',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      isReadOnly: true,
    };
    const child: PartDefinitionElement = {
      id: childId,
      kind: 'PartDefinition',
      name: 'AnythingDef',
      isAbstract: false,
      ownerId: libId,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    registry.add(lib);
    registry.add(child);

    expect(useWorkspaceStore.getState().commandError).toBeNull();

    render(<CommandErrorBanner />);
    expect(screen.queryByTestId('command-error-banner')).toBeNull();

    act(() => {
      expect(() => {
        bus.dispatch(
          { kind: 'update-element', id: childId, patch: { name: 'illegal' } },
          state.user!,
        );
      }).toThrow(LibraryViolationError);
    });

    expect(useWorkspaceStore.getState().commandError).toEqual({
      message: 'Cannot modify read-only library element',
    });

    expect(
      screen.getByTestId('command-error-banner-text').textContent,
    ).toMatch(/Cannot modify read-only library element/);
  });
});
