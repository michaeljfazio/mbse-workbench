// T-13.05d — `recordCommandUse` records most-recently-used palette command
// ids on the workspace store. The action is intentionally tiny (dedupe +
// prepend + cap); these specs lock the invariants the CommandPalette and
// `recentPaletteCommands` helper rely on.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_RECENT_COMMAND_IDS,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

describe('workspace store: recordCommandUse (T-13.05d)', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
  });
  afterEach(() => {
    resetWorkspaceStoreForTests();
  });

  it('starts with an empty recentCommandIds list', () => {
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([]);
  });

  it('appends a single id to the front', () => {
    useWorkspaceStore.getState().recordCommandUse('workspace.undo');
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([
      'workspace.undo',
    ]);
  });

  it('most-recent use moves to the front', () => {
    const { recordCommandUse } = useWorkspaceStore.getState();
    recordCommandUse('workspace.undo');
    recordCommandUse('workspace.save-project');
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([
      'workspace.save-project',
      'workspace.undo',
    ]);
  });

  it('deduplicates: re-recording an existing id moves it to front instead of duplicating it', () => {
    const { recordCommandUse } = useWorkspaceStore.getState();
    recordCommandUse('workspace.undo');
    recordCommandUse('workspace.save-project');
    recordCommandUse('workspace.undo');
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([
      'workspace.undo',
      'workspace.save-project',
    ]);
  });

  it('caps the list at MAX_RECENT_COMMAND_IDS (oldest evicted)', () => {
    const { recordCommandUse } = useWorkspaceStore.getState();
    const ids = Array.from(
      { length: MAX_RECENT_COMMAND_IDS + 2 },
      (_, i) => `cmd.${i}`,
    );
    for (const id of ids) recordCommandUse(id);
    const stored = useWorkspaceStore.getState().recentCommandIds;
    expect(stored.length).toBe(MAX_RECENT_COMMAND_IDS);
    // Stored MRU-first; the two oldest (`cmd.0`, `cmd.1`) were evicted.
    expect(stored).toEqual(ids.slice().reverse().slice(0, MAX_RECENT_COMMAND_IDS));
    expect(stored).not.toContain('cmd.0');
    expect(stored).not.toContain('cmd.1');
  });

  it('ignores the empty string (defensive — there is no valid empty command id)', () => {
    const { recordCommandUse } = useWorkspaceStore.getState();
    recordCommandUse('workspace.undo');
    recordCommandUse('');
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([
      'workspace.undo',
    ]);
  });

  it('resetWorkspaceStoreForTests clears recents', () => {
    useWorkspaceStore.getState().recordCommandUse('workspace.undo');
    expect(useWorkspaceStore.getState().recentCommandIds.length).toBe(1);
    resetWorkspaceStoreForTests();
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([]);
  });
});
