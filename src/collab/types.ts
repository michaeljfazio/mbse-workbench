import type { ModelEdge, ModelElement, UserId } from '@/model';

export interface User {
  readonly id: UserId;
  readonly name: string;
}

export type PermissionAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'link'
  | 'unlink';

export type PermissionTarget = ModelElement | ModelEdge | undefined;

export type PermissionHook = (
  user: User,
  action: PermissionAction,
  target: PermissionTarget,
) => boolean;

export const allowAll: PermissionHook = () => true;
