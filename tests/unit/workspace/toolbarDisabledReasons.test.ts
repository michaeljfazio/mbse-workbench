import { describe, expect, it } from 'vitest';

import {
  AUTO_LAYOUT_DISABLED_REASON,
  DELETE_DISABLED_REASON,
  EXPORT_DISABLED_REASON,
  REDO_DISABLED_REASON,
  SAVE_DISABLED_REASON,
  SPLIT_ACTIVE_DIAGRAM_REASON,
  SPLIT_SECONDARY_DIAGRAM_REASON,
  UNDO_DISABLED_REASON,
  autoLayoutDisabledReason,
  deleteDisabledReason,
  exportDisabledReason,
  redoDisabledReason,
  saveDisabledReason,
  splitDisabledReason,
  undoDisabledReason,
} from '@/workspace/toolbarDisabledReasons';

describe('toolbarDisabledReasons', () => {
  describe('saveDisabledReason', () => {
    it('returns reason when not initialized', () => {
      expect(saveDisabledReason(false)).toBe(SAVE_DISABLED_REASON);
    });

    it('returns undefined when initialized', () => {
      expect(saveDisabledReason(true)).toBeUndefined();
    });
  });

  describe('autoLayoutDisabledReason', () => {
    it('returns reason when elementCount is 0', () => {
      expect(autoLayoutDisabledReason(0)).toBe(AUTO_LAYOUT_DISABLED_REASON);
    });

    it('returns undefined when elements exist', () => {
      expect(autoLayoutDisabledReason(1)).toBeUndefined();
      expect(autoLayoutDisabledReason(42)).toBeUndefined();
    });
  });

  describe('deleteDisabledReason', () => {
    it('returns reason when selection is empty', () => {
      expect(deleteDisabledReason(0)).toBe(DELETE_DISABLED_REASON);
    });

    it('returns undefined when selection is non-empty', () => {
      expect(deleteDisabledReason(1)).toBeUndefined();
      expect(deleteDisabledReason(7)).toBeUndefined();
    });
  });

  describe('exportDisabledReason', () => {
    it('returns reason when elementCount is 0', () => {
      expect(exportDisabledReason(0)).toBe(EXPORT_DISABLED_REASON);
    });

    it('returns undefined when elements exist', () => {
      expect(exportDisabledReason(3)).toBeUndefined();
    });
  });

  describe('splitDisabledReason', () => {
    it('returns active-diagram reason when isActiveDiagram is true', () => {
      expect(
        splitDisabledReason({ isActiveDiagram: true, isSecondaryDiagram: false }),
      ).toBe(SPLIT_ACTIVE_DIAGRAM_REASON);
    });

    it('returns secondary-diagram reason when only isSecondaryDiagram is true', () => {
      expect(
        splitDisabledReason({ isActiveDiagram: false, isSecondaryDiagram: true }),
      ).toBe(SPLIT_SECONDARY_DIAGRAM_REASON);
    });

    it('prefers active-diagram reason when both flags are true', () => {
      expect(
        splitDisabledReason({ isActiveDiagram: true, isSecondaryDiagram: true }),
      ).toBe(SPLIT_ACTIVE_DIAGRAM_REASON);
    });

    it('returns undefined when neither flag is set', () => {
      expect(
        splitDisabledReason({ isActiveDiagram: false, isSecondaryDiagram: false }),
      ).toBeUndefined();
    });
  });

  describe('undoDisabledReason', () => {
    it('returns reason when canUndo is false', () => {
      expect(undoDisabledReason(false)).toBe(UNDO_DISABLED_REASON);
    });

    it('returns undefined when canUndo is true', () => {
      expect(undoDisabledReason(true)).toBeUndefined();
    });
  });

  describe('redoDisabledReason', () => {
    it('returns reason when canRedo is false', () => {
      expect(redoDisabledReason(false)).toBe(REDO_DISABLED_REASON);
    });

    it('returns undefined when canRedo is true', () => {
      expect(redoDisabledReason(true)).toBeUndefined();
    });
  });
});
