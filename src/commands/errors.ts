import type { PermissionAction, PermissionTarget } from '@/collab';

export class PermissionDeniedError extends Error {
  readonly action: PermissionAction;
  readonly target: PermissionTarget;

  constructor(action: PermissionAction, target: PermissionTarget) {
    super(
      `permission denied for action "${action}"${target ? ` on ${target.kind} ${target.id}` : ''}`,
    );
    this.name = 'PermissionDeniedError';
    this.action = action;
    this.target = target;
  }
}
