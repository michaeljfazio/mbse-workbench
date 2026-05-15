export const SAVED_INDICATOR_CLEAN_LABEL = 'Saved';
export const SAVED_INDICATOR_DIRTY_LABEL = 'Saving…';
export const SAVED_INDICATOR_NEVER_SAVED_TITLE = 'Never saved';

export function isDirty(modelVersion: number, lastSavedVersion: number): boolean {
  return modelVersion > lastSavedVersion;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(nowMs: number, atMs: number): string {
  const delta = Math.max(0, nowMs - atMs);
  if (delta < 10 * SECOND) return 'just now';
  if (delta < MINUTE) return `${Math.floor(delta / SECOND)}s ago`;
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  if (delta < 2 * DAY) return 'Yesterday';
  return `${Math.floor(delta / DAY)} days ago`;
}

export interface SavedIndicatorTitleInput {
  readonly lastSavedAt: string | null;
  readonly nowMs: number;
}

export function savedIndicatorTitle(input: SavedIndicatorTitleInput): string {
  if (input.lastSavedAt === null) return SAVED_INDICATOR_NEVER_SAVED_TITLE;
  const atMs = Date.parse(input.lastSavedAt);
  if (!Number.isFinite(atMs)) return SAVED_INDICATOR_NEVER_SAVED_TITLE;
  return `Last saved ${formatRelativeTime(input.nowMs, atMs)}`;
}
