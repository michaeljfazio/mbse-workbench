import type { ModelEdge, ModelElement } from '@/model';
import type { User } from './user';

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

export const can: PermissionHook = (user, _action, target) => {
  if (!target) return true;
  if (!('ownerUserId' in target)) return true;
  const ownerUserId = (target as { ownerUserId?: User['id'] }).ownerUserId;
  if (ownerUserId === undefined) return true;
  return ownerUserId === user.id;
};
