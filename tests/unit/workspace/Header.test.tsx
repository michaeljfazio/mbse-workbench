import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { Header } from '@/workspace/Header';
import {
  PROJECT_NAME_ENABLED_TITLE,
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

function projectNameButton(): HTMLButtonElement {
  return screen.getByTestId('workspace-project-name') as HTMLButtonElement;
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

  it('renders the project name as a disabled affordance before bootstrap (T-13.08)', () => {
    render(<Header />);
    const btn = projectNameButton();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe(SAVE_DISABLED_REASON);
    expect(btn.textContent).toBe('Loading…');
  });

  it('renders the project name as an enabled affordance after bootstrap (T-13.08)', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    const btn = projectNameButton();
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('title')).toBe(PROJECT_NAME_ENABLED_TITLE);
    expect(btn.textContent).toBe('Untitled Project');
  });

  it('clicking the project name swaps in a focused, pre-selected input (T-13.08)', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    fireEvent.click(projectNameButton());
    const input = screen.getByTestId(
      'workspace-project-name-input',
    ) as HTMLInputElement;
    expect(input.value).toBe('Untitled Project');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Untitled Project'.length);
  });

  it('Enter commits the rename and returns to display mode (T-13.08)', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    fireEvent.click(projectNameButton());
    const input = screen.getByTestId(
      'workspace-project-name-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Acme System' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useWorkspaceStore.getState().project?.name).toBe('Acme System');
    expect(screen.queryByTestId('workspace-project-name-input')).toBeNull();
    expect(projectNameButton().textContent).toBe('Acme System');
  });

  it('blur commits the rename (T-13.08)', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    fireEvent.click(projectNameButton());
    const input = screen.getByTestId(
      'workspace-project-name-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Beta' } });
    fireEvent.blur(input);

    expect(useWorkspaceStore.getState().project?.name).toBe('Beta');
    expect(screen.queryByTestId('workspace-project-name-input')).toBeNull();
  });

  it('Escape cancels the rename without mutating the store (T-13.08)', async () => {
    await act(async () => {
      await bootstrap();
    });
    render(<Header />);
    const before = useWorkspaceStore.getState().project?.name;
    fireEvent.click(projectNameButton());
    const input = screen.getByTestId(
      'workspace-project-name-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(useWorkspaceStore.getState().project?.name).toBe(before);
    expect(screen.queryByTestId('workspace-project-name-input')).toBeNull();
    expect(projectNameButton().textContent).toBe(before);
  });
});
