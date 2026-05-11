import { createUserId, type UserId } from '@/model';

export interface User {
  readonly id: UserId;
  readonly displayName: string;
  readonly color: string;
}

export const USER_COLORS: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function pickColor(id: string): string {
  const idx = hashString(id) % USER_COLORS.length;
  const c = USER_COLORS[idx];
  if (c === undefined) throw new Error('USER_COLORS palette is empty');
  return c;
}

export interface CreateSessionUserOptions {
  readonly id?: UserId;
  readonly displayName?: string;
}

export function createSessionUser(options?: CreateSessionUserOptions): User {
  const id = options?.id ?? createUserId();
  const displayName = options?.displayName ?? 'You';
  const color = pickColor(id);
  return { id, displayName, color };
}
