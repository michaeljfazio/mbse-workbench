import { describe, expect, it, vi } from 'vitest';

import {
  BUILT_IN_PALETTE_COMMANDS,
  filterPaletteCommands,
  type PaletteCommandContext,
} from '@/workspace/paletteCommands';

function ctx(
  overrides: Partial<PaletteCommandContext> = {},
): PaletteCommandContext {
  return {
    canUndo: true,
    canRedo: true,
    hasDiagramSelection: true,
    hasProject: true,
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
    deleteSelection: vi.fn(),
    ...overrides,
  };
}

describe('BUILT_IN_PALETTE_COMMANDS (T-13.05a)', () => {
  it('contains Undo / Redo / Save project / Delete selection', () => {
    const ids = BUILT_IN_PALETTE_COMMANDS.map((c) => c.id);
    expect(ids).toContain('workspace.undo');
    expect(ids).toContain('workspace.redo');
    expect(ids).toContain('workspace.save-project');
    expect(ids).toContain('workspace.delete-selection');
  });

  it('command IDs are unique', () => {
    const ids = BUILT_IN_PALETTE_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every command has a non-empty label', () => {
    for (const c of BUILT_IN_PALETTE_COMMANDS) {
      expect(c.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('Undo is enabled iff canUndo is true', () => {
    const c = BUILT_IN_PALETTE_COMMANDS.find((x) => x.id === 'workspace.undo');
    expect(c).toBeDefined();
    expect(c!.isEnabled(ctx({ canUndo: false }))).toBe(false);
    expect(c!.isEnabled(ctx({ canUndo: true }))).toBe(true);
  });

  it('Redo is enabled iff canRedo is true', () => {
    const c = BUILT_IN_PALETTE_COMMANDS.find((x) => x.id === 'workspace.redo');
    expect(c).toBeDefined();
    expect(c!.isEnabled(ctx({ canRedo: false }))).toBe(false);
    expect(c!.isEnabled(ctx({ canRedo: true }))).toBe(true);
  });

  it('Save project is enabled iff a project is loaded', () => {
    const c = BUILT_IN_PALETTE_COMMANDS.find(
      (x) => x.id === 'workspace.save-project',
    );
    expect(c).toBeDefined();
    expect(c!.isEnabled(ctx({ hasProject: false }))).toBe(false);
    expect(c!.isEnabled(ctx({ hasProject: true }))).toBe(true);
  });

  it('Delete selection is enabled iff a diagram has a selection', () => {
    const c = BUILT_IN_PALETTE_COMMANDS.find(
      (x) => x.id === 'workspace.delete-selection',
    );
    expect(c).toBeDefined();
    expect(c!.isEnabled(ctx({ hasDiagramSelection: false }))).toBe(false);
    expect(c!.isEnabled(ctx({ hasDiagramSelection: true }))).toBe(true);
  });

  it('each command run() delegates to its context action', () => {
    const context = ctx();
    for (const c of BUILT_IN_PALETTE_COMMANDS) c.run(context);
    expect(context.undo).toHaveBeenCalledTimes(1);
    expect(context.redo).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.deleteSelection).toHaveBeenCalledTimes(1);
  });
});

describe('filterPaletteCommands (T-13.05a)', () => {
  it('returns all enabled commands when query is empty', () => {
    const result = filterPaletteCommands(
      '',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.map((c) => c.id)).toEqual(
      BUILT_IN_PALETTE_COMMANDS.map((c) => c.id),
    );
  });

  it('treats a whitespace-only query as empty', () => {
    const result = filterPaletteCommands(
      '   ',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.length).toBe(BUILT_IN_PALETTE_COMMANDS.length);
  });

  it('omits commands whose isEnabled returns false', () => {
    const result = filterPaletteCommands(
      '',
      BUILT_IN_PALETTE_COMMANDS,
      ctx({ canUndo: false, canRedo: false }),
    );
    const ids = result.map((c) => c.id);
    expect(ids).not.toContain('workspace.undo');
    expect(ids).not.toContain('workspace.redo');
    expect(ids).toContain('workspace.save-project');
    expect(ids).toContain('workspace.delete-selection');
  });

  it('matches by label substring case-insensitively', () => {
    const result = filterPaletteCommands(
      'REDO',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.map((c) => c.id)).toEqual(['workspace.redo']);
  });

  it('matches by description substring', () => {
    const result = filterPaletteCommands(
      'snapshot',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.map((c) => c.id)).toContain('workspace.save-project');
  });

  it('matches by keyword', () => {
    const result = filterPaletteCommands(
      'download',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.map((c) => c.id)).toContain('workspace.save-project');
  });

  it('trims surrounding whitespace before matching', () => {
    const result = filterPaletteCommands(
      '  redo  ',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result.map((c) => c.id)).toEqual(['workspace.redo']);
  });

  it('returns [] when no enabled command matches the query', () => {
    const result = filterPaletteCommands(
      'no-such-command',
      BUILT_IN_PALETTE_COMMANDS,
      ctx(),
    );
    expect(result).toEqual([]);
  });
});
