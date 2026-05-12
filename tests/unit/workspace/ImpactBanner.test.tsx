import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { ImpactBanner } from '@/workspace/ImpactBanner';
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

describe('<ImpactBanner />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders nothing when impactRootId is null', async () => {
    await bootstrap();
    const { container } = render(<ImpactBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows root name + element count when an impact is active', async () => {
    await bootstrap();
    const state = useWorkspaceStore.getState();
    const a = state.createBlock({ x: 0, y: 0 });
    const b = state.createBlock({ x: 200, y: 0 });
    if (!a || !b) throw new Error('createBlock failed');
    useWorkspaceStore.getState().linkBlocks(a, b, 'Composition');
    act(() => {
      useWorkspaceStore.getState().runImpactAnalysis(a);
    });
    render(<ImpactBanner />);
    const banner = screen.getByTestId('impact-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toMatch(/Impact:/);
    expect(banner.textContent).toMatch(/2 elements/);
  });

  it('uses singular "element" when count is 1', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    if (!a) throw new Error('createBlock failed');
    act(() => {
      useWorkspaceStore.getState().runImpactAnalysis(a);
    });
    render(<ImpactBanner />);
    expect(screen.getByTestId('impact-banner').textContent).toMatch(
      / 1 element(?!s)/,
    );
  });

  it('Clear button invokes clearImpactHighlight and hides the banner', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    if (!a) throw new Error('createBlock failed');
    act(() => {
      useWorkspaceStore.getState().runImpactAnalysis(a);
    });
    const { rerender } = render(<ImpactBanner />);
    expect(screen.queryByTestId('impact-banner')).not.toBeNull();
    act(() => {
      fireEvent.click(screen.getByTestId('impact-banner-clear'));
    });
    rerender(<ImpactBanner />);
    expect(screen.queryByTestId('impact-banner')).toBeNull();
    expect(useWorkspaceStore.getState().impactRootId).toBeNull();
  });
});
