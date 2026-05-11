import type { EdgeId, ElementId, UserId } from '@/model';

export const mkElementId = (s: string): ElementId => s as ElementId;

export const mkEdgeId = (s: string): EdgeId => s as EdgeId;

export const mkUserId = (s: string): UserId => s as UserId;

export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${JSON.stringify(value)}`);
}
