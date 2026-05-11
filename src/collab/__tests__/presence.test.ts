import { describe, expect, it, vi } from 'vitest';
import { createElementId, createUserId, type ElementId } from '@/model';
import { createPresenceStore } from '../presence';

function mkElementId(): ElementId {
  return createElementId();
}

describe('PresenceStore.setSelection / getSelection', () => {
  it('returns an empty selection for an unknown user', () => {
    const store = createPresenceStore();
    const u = createUserId();
    expect(store.getSelection(u)).toEqual([]);
  });

  it('records and retrieves a selection for a user', () => {
    const store = createPresenceStore();
    const u = createUserId();
    const e1 = mkElementId();
    const e2 = mkElementId();
    store.setSelection(u, [e1, e2]);
    expect(store.getSelection(u)).toEqual([e1, e2]);
  });

  it('replaces (does not merge) a user selection on subsequent setSelection', () => {
    const store = createPresenceStore();
    const u = createUserId();
    const e1 = mkElementId();
    const e2 = mkElementId();
    store.setSelection(u, [e1]);
    store.setSelection(u, [e2]);
    expect(store.getSelection(u)).toEqual([e2]);
  });

  it('returns a defensive copy from getSelection (caller mutation does not corrupt store)', () => {
    const store = createPresenceStore();
    const u = createUserId();
    const e1 = mkElementId();
    store.setSelection(u, [e1]);
    const snap = store.getSelection(u) as ElementId[];
    snap.length = 0;
    expect(store.getSelection(u)).toEqual([e1]);
  });
});

describe('PresenceStore.allPresences', () => {
  it('returns one entry per user with current selection', () => {
    const store = createPresenceStore();
    const u1 = createUserId();
    const u2 = createUserId();
    const e1 = mkElementId();
    const e2 = mkElementId();
    store.setSelection(u1, [e1]);
    store.setSelection(u2, [e2]);
    const all = store.allPresences();
    expect(all).toHaveLength(2);
    expect(all.find((p) => p.userId === u1)?.selection).toEqual([e1]);
    expect(all.find((p) => p.userId === u2)?.selection).toEqual([e2]);
  });

  it('omits users that were cleared with an empty selection', () => {
    const store = createPresenceStore();
    const u = createUserId();
    const e = mkElementId();
    store.setSelection(u, [e]);
    store.setSelection(u, []);
    expect(store.allPresences()).toEqual([]);
  });
});

describe('PresenceStore.subscribe', () => {
  it('fires subscribers on every setSelection with the changed user', () => {
    const store = createPresenceStore();
    const handler = vi.fn();
    const unsub = store.subscribe(handler);
    const u = createUserId();
    const e = mkElementId();
    store.setSelection(u, [e]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ userId: u, selection: [e] });
    unsub();
  });

  it('does not fire after unsubscribe', () => {
    const store = createPresenceStore();
    const handler = vi.fn();
    const unsub = store.subscribe(handler);
    unsub();
    store.setSelection(createUserId(), [mkElementId()]);
    expect(handler).not.toHaveBeenCalled();
  });
});
