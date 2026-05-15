import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { Header } from '@/workspace/Header';
import {
  SAVE_DISABLED_REASON,
} from '@/workspace/toolbarDisabledReasons';
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

function saveButton(): HTMLButtonElement {
  const buttons = screen.getAllByRole('button');
  const found = buttons.find((b) => b.textContent?.trim() === 'Save');
  if (!found) throw new Error('Save button not found');
  return found as HTMLButtonElement;
}

describe('<Header />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('disables Save and shows the loading reason as title before bootstrap', () => {
    render(<Header />);
    const button = saveButton();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('title')).toBe(SAVE_DISABLED_REASON);
  });

  it('enables Save and clears the title after bootstrap', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    const button = saveButton();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('title')).toBeNull();
  });
});
