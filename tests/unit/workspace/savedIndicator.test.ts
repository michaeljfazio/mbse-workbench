import { describe, expect, it } from 'vitest';

import {
  formatRelativeTime,
  isDirty,
  SAVED_INDICATOR_NEVER_SAVED_TITLE,
  savedIndicatorTitle,
} from '../../../src/workspace/savedIndicator';

describe('isDirty', () => {
  it('is false when modelVersion equals lastSavedVersion', () => {
    expect(isDirty(7, 7)).toBe(false);
  });

  it('is true when modelVersion exceeds lastSavedVersion', () => {
    expect(isDirty(8, 7)).toBe(true);
  });

  it('is false when lastSavedVersion is ahead (defensive)', () => {
    expect(isDirty(5, 6)).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  const NOW = 1_700_000_000_000;

  it('returns "just now" for sub-10s deltas', () => {
    expect(formatRelativeTime(NOW, NOW)).toBe('just now');
    expect(formatRelativeTime(NOW, NOW - 9_999)).toBe('just now');
  });

  it('returns "Ns ago" for 10s..59s deltas', () => {
    expect(formatRelativeTime(NOW, NOW - 10_000)).toBe('10s ago');
    expect(formatRelativeTime(NOW, NOW - 59_999)).toBe('59s ago');
  });

  it('returns "Nm ago" for 1m..59m deltas', () => {
    expect(formatRelativeTime(NOW, NOW - 60_000)).toBe('1m ago');
    expect(formatRelativeTime(NOW, NOW - 59 * 60_000)).toBe('59m ago');
  });

  it('returns "Nh ago" for 1h..23h deltas', () => {
    expect(formatRelativeTime(NOW, NOW - 3_600_000)).toBe('1h ago');
    expect(formatRelativeTime(NOW, NOW - 23 * 3_600_000)).toBe('23h ago');
  });

  it('returns "Yesterday" for 24h..47h deltas', () => {
    expect(formatRelativeTime(NOW, NOW - 24 * 3_600_000)).toBe('Yesterday');
    expect(formatRelativeTime(NOW, NOW - 47 * 3_600_000)).toBe('Yesterday');
  });

  it('returns "N days ago" for 48h+ deltas', () => {
    expect(formatRelativeTime(NOW, NOW - 48 * 3_600_000)).toBe('2 days ago');
    expect(formatRelativeTime(NOW, NOW - 10 * 24 * 3_600_000)).toBe('10 days ago');
  });

  it('clamps negative deltas to "just now"', () => {
    expect(formatRelativeTime(NOW, NOW + 5_000)).toBe('just now');
  });
});

describe('savedIndicatorTitle', () => {
  const NOW = 1_700_000_000_000;
  const FIVE_MIN_AGO_ISO = new Date(NOW - 5 * 60_000).toISOString();

  it('returns the never-saved title when lastSavedAt is null', () => {
    expect(savedIndicatorTitle({ lastSavedAt: null, nowMs: NOW })).toBe(
      SAVED_INDICATOR_NEVER_SAVED_TITLE,
    );
  });

  it('returns "Last saved <relative>" for a parseable timestamp', () => {
    expect(savedIndicatorTitle({ lastSavedAt: FIVE_MIN_AGO_ISO, nowMs: NOW })).toBe(
      'Last saved 5m ago',
    );
  });

  it('returns "Last saved just now" for a freshly-saved project', () => {
    expect(savedIndicatorTitle({ lastSavedAt: new Date(NOW).toISOString(), nowMs: NOW })).toBe(
      'Last saved just now',
    );
  });

  it('falls back to the never-saved title for unparseable timestamps', () => {
    expect(savedIndicatorTitle({ lastSavedAt: 'not-a-date', nowMs: NOW })).toBe(
      SAVED_INDICATOR_NEVER_SAVED_TITLE,
    );
  });
});
