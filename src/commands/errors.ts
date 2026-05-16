import type { PermissionAction, PermissionTarget } from '@/collab';
import type { ElementId } from '@/model';
import type { Command } from './types';

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

/**
 * Thrown by the command bus when a destructive command targets an element
 * whose containment chain includes a read-only Package (`isReadOnly: true`).
 *
 * Carries the offending command and the element id that triggered the
 * rejection (the read-only ancestor, or the target itself if it is the
 * read-only Package). See ADR 0012.
 */
export class LibraryViolationError extends Error {
  readonly command: Command;
  readonly elementId: ElementId;

  constructor(command: Command, elementId: ElementId) {
    super(
      `library violation: command "${command.kind}" rejected because element ` +
        `${elementId} is inside a read-only Package`,
    );
    this.name = 'LibraryViolationError';
    this.command = command;
    this.elementId = elementId;
  }
}
