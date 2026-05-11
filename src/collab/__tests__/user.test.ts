import { describe, expect, it } from 'vitest';
import { createSessionUser, USER_COLORS, type User } from '../user';

describe('createSessionUser', () => {
  it('returns a User with id, displayName "You", and a color from the palette', () => {
    const user: User = createSessionUser();
    expect(typeof user.id).toBe('string');
    expect(user.id.length).toBeGreaterThan(0);
    expect(user.displayName).toBe('You');
    expect(USER_COLORS).toContain(user.color);
  });

  it('returns a fresh id each call so two sessions cannot collide', () => {
    const a = createSessionUser();
    const b = createSessionUser();
    expect(a.id).not.toBe(b.id);
  });

  it('color is deterministic given a fixed id (hash-based pick from palette)', () => {
    const id = 'fixed-id-1234' as User['id'];
    const a = createSessionUser({ id, displayName: 'A' });
    const b = createSessionUser({ id, displayName: 'B' });
    expect(a.color).toBe(b.color);
  });

  it('accepts overrides for displayName', () => {
    const u = createSessionUser({ displayName: 'Reviewer' });
    expect(u.displayName).toBe('Reviewer');
  });
});

describe('USER_COLORS palette', () => {
  it('is a small, deduplicated palette of valid CSS color hex strings', () => {
    expect(USER_COLORS.length).toBeGreaterThanOrEqual(4);
    expect(USER_COLORS.length).toBeLessThanOrEqual(16);
    expect(new Set(USER_COLORS).size).toBe(USER_COLORS.length);
    for (const c of USER_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
