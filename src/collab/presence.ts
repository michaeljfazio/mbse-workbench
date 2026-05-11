import type { ElementId, UserId } from '@/model';

export interface Presence {
  readonly userId: UserId;
  readonly selection: readonly ElementId[];
}

export type PresenceHandler = (presence: Presence) => void;

export type Unsubscribe = () => void;

export interface PresenceStore {
  setSelection(userId: UserId, elementIds: readonly ElementId[]): void;
  getSelection(userId: UserId): readonly ElementId[];
  allPresences(): readonly Presence[];
  subscribe(handler: PresenceHandler): Unsubscribe;
}

export function createPresenceStore(): PresenceStore {
  const selections = new Map<UserId, ElementId[]>();
  const handlers = new Set<PresenceHandler>();

  function notify(presence: Presence): void {
    for (const h of handlers) h(presence);
  }

  return {
    setSelection(userId, elementIds) {
      const copy = [...elementIds];
      if (copy.length === 0) {
        selections.delete(userId);
      } else {
        selections.set(userId, copy);
      }
      notify({ userId, selection: copy });
    },

    getSelection(userId) {
      const stored = selections.get(userId);
      return stored ? [...stored] : [];
    },

    allPresences() {
      const out: Presence[] = [];
      for (const [userId, selection] of selections) {
        out.push({ userId, selection: [...selection] });
      }
      return out;
    },

    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
