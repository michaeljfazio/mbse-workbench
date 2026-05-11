import { describe, expect, it, vi } from 'vitest';
import { createUserId } from '@/model';
import type { ModelEvent } from '@/commands';
import { NoopCollaborationProvider } from '../provider';

function mkEvent(): ModelEvent {
  return {
    id: 'ev-1',
    timestamp: 1,
    actorId: createUserId(),
    command: { kind: 'compound', commands: [] },
    payload: { kind: 'compound', commands: [] },
    modelVersion: 1,
  };
}

describe('NoopCollaborationProvider', () => {
  it('does nothing on publish (no throw, no observable effect)', () => {
    const p = new NoopCollaborationProvider();
    expect(() => p.publish(mkEvent())).not.toThrow();
  });

  it('never fires subscribers, even after publish', () => {
    const p = new NoopCollaborationProvider();
    const handler = vi.fn();
    p.subscribe(handler);
    p.publish(mkEvent());
    p.publish(mkEvent());
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns an Unsubscribe function from subscribe', () => {
    const p = new NoopCollaborationProvider();
    const unsub = p.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});
