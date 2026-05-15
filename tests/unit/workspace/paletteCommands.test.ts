import { describe, expect, it, vi } from 'vitest';

import type { ElementId, ModelElement, PartDefinitionElement } from '@/model';
import {
  BUILT_IN_PALETTE_COMMANDS,
  MAX_RECENT_COMMANDS,
  UNIFIED_LIST_SECTION_THRESHOLD,
  filterPaletteCommands,
  recentPaletteCommands,
  scoreCommandMatch,
  scoreElementMatch,
  selectionScopedCommands,
  type PaletteCommandContext,
} from '@/workspace/paletteCommands';

function ctx(
  overrides: Partial<PaletteCommandContext> = {},
): PaletteCommandContext {
  return {
    canUndo: true,
    canRedo: true,
    hasDiagramSelection: true,
    hasSingleDiagramSelection: true,
    hasProject: true,
    selectionTargetElement: null,
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
    deleteSelection: vi.fn(),
    openChat: vi.fn(),
    showInspector: vi.fn(),
    renameSelection: vi.fn(),
    createRepresentation: vi.fn(),
    ...overrides,
  };
}

const PART_DEFINITION_FIXTURE: PartDefinitionElement = {
  id: 'pd-1' as ElementId,
  name: 'Engine',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  kind: 'PartDefinition',
  isAbstract: false,
};

const PACKAGE_FIXTURE: ModelElement = {
  id: 'pkg-1' as ElementId,
  name: 'Vehicles',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  kind: 'Package',
} as ModelElement;

const PORT_USAGE_FIXTURE: ModelElement = {
  id: 'pu-1' as ElementId,
  name: 'Inlet',
  ownerId: null,
  ownerRole: 'port',
  ownerIndex: 0,
  kind: 'PortUsage',
  definitionId: 'port-def' as ElementId,
} as ModelElement;

describe('BUILT_IN_PALETTE_COMMANDS (T-13.05a/b)', () => {
  it('contains the four T-13.05a actions plus the three T-13.05b actions', () => {
    const ids = BUILT_IN_PALETTE_COMMANDS.map((c) => c.id);
    // T-13.05a
    expect(ids).toContain('workspace.undo');
    expect(ids).toContain('workspace.redo');
    expect(ids).toContain('workspace.save-project');
    expect(ids).toContain('workspace.delete-selection');
    // T-13.05b
    expect(ids).toContain('workspace.open-chat');
    expect(ids).toContain('workspace.show-inspector');
    expect(ids).toContain('workspace.rename-selection');
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

  it('Open chat / Show inspector require a project', () => {
    const open = BUILT_IN_PALETTE_COMMANDS.find(
      (x) => x.id === 'workspace.open-chat',
    );
    const show = BUILT_IN_PALETTE_COMMANDS.find(
      (x) => x.id === 'workspace.show-inspector',
    );
    expect(open).toBeDefined();
    expect(show).toBeDefined();
    expect(open!.isEnabled(ctx({ hasProject: false }))).toBe(false);
    expect(open!.isEnabled(ctx({ hasProject: true }))).toBe(true);
    expect(show!.isEnabled(ctx({ hasProject: false }))).toBe(false);
    expect(show!.isEnabled(ctx({ hasProject: true }))).toBe(true);
  });

  it('Rename selection requires exactly one diagram selection', () => {
    const c = BUILT_IN_PALETTE_COMMANDS.find(
      (x) => x.id === 'workspace.rename-selection',
    );
    expect(c).toBeDefined();
    expect(c!.isEnabled(ctx({ hasSingleDiagramSelection: false }))).toBe(false);
    expect(c!.isEnabled(ctx({ hasSingleDiagramSelection: true }))).toBe(true);
  });

  it('each command run() delegates to its context action', () => {
    const context = ctx();
    for (const c of BUILT_IN_PALETTE_COMMANDS) c.run(context);
    expect(context.undo).toHaveBeenCalledTimes(1);
    expect(context.redo).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.deleteSelection).toHaveBeenCalledTimes(1);
    expect(context.openChat).toHaveBeenCalledTimes(1);
    expect(context.showInspector).toHaveBeenCalledTimes(1);
    expect(context.renameSelection).toHaveBeenCalledTimes(1);
  });
});

describe('filterPaletteCommands (T-13.05a/b)', () => {
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
      ctx({
        canUndo: false,
        canRedo: false,
        hasSingleDiagramSelection: false,
      }),
    );
    const ids = result.map((c) => c.id);
    expect(ids).not.toContain('workspace.undo');
    expect(ids).not.toContain('workspace.redo');
    expect(ids).not.toContain('workspace.rename-selection');
    expect(ids).toContain('workspace.save-project');
    expect(ids).toContain('workspace.delete-selection');
    expect(ids).toContain('workspace.open-chat');
    expect(ids).toContain('workspace.show-inspector');
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

  it('matches the new T-13.05b commands by their keywords', () => {
    expect(
      filterPaletteCommands('llm', BUILT_IN_PALETTE_COMMANDS, ctx()).map(
        (c) => c.id,
      ),
    ).toEqual(['workspace.open-chat']);
    expect(
      filterPaletteCommands(
        'properties',
        BUILT_IN_PALETTE_COMMANDS,
        ctx(),
      ).map((c) => c.id),
    ).toEqual(['workspace.show-inspector']);
  });
});

describe('scoreCommandMatch (T-13.05b)', () => {
  const undo = BUILT_IN_PALETTE_COMMANDS.find(
    (c) => c.id === 'workspace.undo',
  )!;
  const save = BUILT_IN_PALETTE_COMMANDS.find(
    (c) => c.id === 'workspace.save-project',
  )!;

  it('returns 0 for an empty query', () => {
    expect(scoreCommandMatch(undo, '')).toBe(0);
  });

  it('returns 0 when nothing matches', () => {
    expect(scoreCommandMatch(undo, 'xyz')).toBe(0);
  });

  it('scores exact label match higher than prefix higher than substring', () => {
    const exact = scoreCommandMatch(undo, 'undo');
    const prefix = scoreCommandMatch(save, 'save'); // label "Save project as JSON"
    const substring = scoreCommandMatch(save, 'json'); // mid-word
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it('scores word-prefix higher than substring', () => {
    // "Save project as JSON" — "project" is a word-boundary prefix.
    const wordPrefix = scoreCommandMatch(save, 'project');
    const substring = scoreCommandMatch(save, 'roject');
    expect(wordPrefix).toBeGreaterThan(substring);
  });

  it('matches keywords too', () => {
    // Save's keywords include "download".
    expect(scoreCommandMatch(save, 'download')).toBeGreaterThan(0);
  });
});

describe('scoreElementMatch (T-13.05b)', () => {
  it('returns 0 for empty query', () => {
    expect(scoreElementMatch({ name: 'Engine', id: 'e1' }, '')).toBe(0);
  });

  it('returns 0 when neither name nor id contains the query', () => {
    expect(scoreElementMatch({ name: 'Engine', id: 'e1' }, 'pump')).toBe(0);
  });

  it('scores exact match highest', () => {
    expect(scoreElementMatch({ name: 'engine', id: 'e1' }, 'engine')).toBe(1);
  });

  it('scores prefix above substring', () => {
    const prefix = scoreElementMatch({ name: 'EngineRoom', id: 'e1' }, 'engine');
    const substring = scoreElementMatch(
      { name: 'MainEngineRoom', id: 'e1' },
      'engineroom',
    );
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });
});

describe('selectionScopedCommands (T-13.05c)', () => {
  it('returns no commands when no element is selected', () => {
    expect(selectionScopedCommands(ctx())).toEqual([]);
  });

  it('returns BDD / IBD / Parametric create commands for a PartDefinition', () => {
    const cmds = selectionScopedCommands(
      ctx({ selectionTargetElement: PART_DEFINITION_FIXTURE }),
    );
    expect(cmds.map((c) => c.id)).toEqual([
      'selection.create-representation.bdd',
      'selection.create-representation.ibd',
      'selection.create-representation.parametric',
    ]);
    expect(cmds.map((c) => c.label)).toEqual([
      'Create BDD representation',
      'Create IBD representation',
      'Create Parametric representation',
    ]);
  });

  it('returns the four package representations for a Package', () => {
    const cmds = selectionScopedCommands(
      ctx({ selectionTargetElement: PACKAGE_FIXTURE }),
    );
    expect(cmds.map((c) => c.id)).toEqual([
      'selection.create-representation.bdd',
      'selection.create-representation.requirements',
      'selection.create-representation.use-case',
      'selection.create-representation.package',
    ]);
  });

  it('returns no commands for an element kind without accepted representations', () => {
    expect(
      selectionScopedCommands(
        ctx({ selectionTargetElement: PORT_USAGE_FIXTURE }),
      ),
    ).toEqual([]);
  });

  it('each command is always enabled (selection acts as the gate)', () => {
    const cmds = selectionScopedCommands(
      ctx({ selectionTargetElement: PART_DEFINITION_FIXTURE }),
    );
    for (const c of cmds) expect(c.isEnabled(ctx())).toBe(true);
  });

  it('run() delegates to context.createRepresentation with the matching option', () => {
    const createRepresentation = vi.fn();
    const context = ctx({
      selectionTargetElement: PART_DEFINITION_FIXTURE,
      createRepresentation,
    });
    const cmds = selectionScopedCommands(context);
    cmds.find((c) => c.id === 'selection.create-representation.ibd')!.run(
      context,
    );
    expect(createRepresentation).toHaveBeenCalledTimes(1);
    const arg = createRepresentation.mock.calls[0]![0];
    expect(arg).toEqual({
      viewpointId: 'ibd',
      contextKind: 'partDefinition',
      label: 'IBD',
    });
  });

  it('matches by viewpoint id keyword when filtered', () => {
    const cmds = selectionScopedCommands(
      ctx({ selectionTargetElement: PART_DEFINITION_FIXTURE }),
    );
    const filtered = filterPaletteCommands(
      'ibd',
      cmds,
      ctx({ selectionTargetElement: PART_DEFINITION_FIXTURE }),
    );
    expect(filtered.map((c) => c.id)).toEqual([
      'selection.create-representation.ibd',
    ]);
  });
});

describe('recentPaletteCommands (T-13.05d)', () => {
  it('returns [] when no recent ids are recorded', () => {
    expect(
      recentPaletteCommands(BUILT_IN_PALETTE_COMMANDS, [], ctx()),
    ).toEqual([]);
  });

  it('returns commands in recents (MRU) order, not registry order', () => {
    const result = recentPaletteCommands(
      BUILT_IN_PALETTE_COMMANDS,
      ['workspace.save-project', 'workspace.undo'],
      ctx(),
    );
    expect(result.map((c) => c.id)).toEqual([
      'workspace.save-project',
      'workspace.undo',
    ]);
  });

  it('skips ids that do not exist in the supplied command set', () => {
    const result = recentPaletteCommands(
      BUILT_IN_PALETTE_COMMANDS,
      ['workspace.no-such-command', 'workspace.undo'],
      ctx(),
    );
    expect(result.map((c) => c.id)).toEqual(['workspace.undo']);
  });

  it('skips commands whose isEnabled returns false in the current context', () => {
    // hasDiagramSelection=false disables delete; canUndo=false disables undo.
    const result = recentPaletteCommands(
      BUILT_IN_PALETTE_COMMANDS,
      ['workspace.delete-selection', 'workspace.save-project', 'workspace.undo'],
      ctx({ hasDiagramSelection: false, canUndo: false }),
    );
    expect(result.map((c) => c.id)).toEqual(['workspace.save-project']);
  });

  it('caps the returned list at MAX_RECENT_COMMANDS', () => {
    const allIds = BUILT_IN_PALETTE_COMMANDS.map((c) => c.id);
    // Seven built-ins exist; recents request all of them.
    expect(allIds.length).toBeGreaterThan(MAX_RECENT_COMMANDS);
    const result = recentPaletteCommands(
      BUILT_IN_PALETTE_COMMANDS,
      allIds,
      ctx(),
    );
    expect(result.length).toBe(MAX_RECENT_COMMANDS);
    // The cap honours MRU order — earliest ids fill the slots.
    expect(result.map((c) => c.id)).toEqual(
      allIds.slice(0, MAX_RECENT_COMMANDS),
    );
  });

  it('caps after filtering out disabled or unknown ids, not before', () => {
    // The first two ids are pruned (unknown + disabled). Without the
    // "filter-then-cap" ordering, only three commands would be returned;
    // with it, five enabled commands populate the cap.
    const allEnabledIds = BUILT_IN_PALETTE_COMMANDS.map((c) => c.id);
    const result = recentPaletteCommands(
      BUILT_IN_PALETTE_COMMANDS,
      ['workspace.no-such', 'workspace.delete-selection', ...allEnabledIds],
      ctx({ hasDiagramSelection: false }),
    );
    expect(result.length).toBe(MAX_RECENT_COMMANDS);
    for (const c of result) {
      expect(c.id).not.toBe('workspace.no-such');
      expect(c.id).not.toBe('workspace.delete-selection');
    }
  });

  it('UNIFIED_LIST_SECTION_THRESHOLD is the small constant the palette splits at', () => {
    // Documenting the constant so a future change here trips the test.
    expect(UNIFIED_LIST_SECTION_THRESHOLD).toBe(5);
  });

  it('MAX_RECENT_COMMANDS matches the workspace store cap', () => {
    expect(MAX_RECENT_COMMANDS).toBe(5);
  });
});
