import type { ModelEvent, Unsubscribe } from '@/commands';

export interface CollaborationProvider {
  publish(event: ModelEvent): void;
  subscribe(handler: (event: ModelEvent) => void): Unsubscribe;
}

export class NoopCollaborationProvider implements CollaborationProvider {
  publish(_event: ModelEvent): void {
    // single-user mode: discard
  }

  subscribe(_handler: (event: ModelEvent) => void): Unsubscribe {
    return () => {};
  }
}
