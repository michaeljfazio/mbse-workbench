export const SAVE_DISABLED_REASON = 'Project still loading…';
export const AUTO_LAYOUT_DISABLED_REASON = 'No elements to lay out';
export const DELETE_DISABLED_REASON = 'Select something on the diagram to delete';
export const EXPORT_DISABLED_REASON = 'No elements to export';
export const SPLIT_ACTIVE_DIAGRAM_REASON = 'Already the main diagram';
export const SPLIT_SECONDARY_DIAGRAM_REASON = 'Already shown in the split pane';

export function saveDisabledReason(initialized: boolean): string | undefined {
  return initialized ? undefined : SAVE_DISABLED_REASON;
}

export function autoLayoutDisabledReason(elementCount: number): string | undefined {
  return elementCount === 0 ? AUTO_LAYOUT_DISABLED_REASON : undefined;
}

export function deleteDisabledReason(selectionCount: number): string | undefined {
  return selectionCount === 0 ? DELETE_DISABLED_REASON : undefined;
}

export function exportDisabledReason(elementCount: number): string | undefined {
  return elementCount === 0 ? EXPORT_DISABLED_REASON : undefined;
}

export interface SplitDisabledInput {
  readonly isActiveDiagram: boolean;
  readonly isSecondaryDiagram: boolean;
}

export function splitDisabledReason(input: SplitDisabledInput): string | undefined {
  if (input.isActiveDiagram) return SPLIT_ACTIVE_DIAGRAM_REASON;
  if (input.isSecondaryDiagram) return SPLIT_SECONDARY_DIAGRAM_REASON;
  return undefined;
}
