/**
 * Unit tests for DragCoordOverlay coordinate formatting.
 *
 * The overlay's text-formatting logic (`formatDragCoord`) is a pure function
 * that must:
 * - Wrap coordinates in parentheses separated by a comma and space.
 * - Round floating-point values to the nearest integer (standard rounding).
 *
 * These tests must fail without the `formatDragCoord` implementation and pass
 * with it — verifying the vertical-slice contract before the E2E layer runs.
 *
 * Refs #375
 */
import { describe, expect, it } from 'vitest';

import { formatDragCoord } from '@/workspace/dragCoord';

describe('formatDragCoord', () => {
  it('formats integer coordinates', () => {
    expect(formatDragCoord({ x: 120, y: 80 })).toBe('(120, 80)');
  });

  it('rounds fractional x down', () => {
    expect(formatDragCoord({ x: 120.4, y: 80 })).toBe('(120, 80)');
  });

  it('rounds fractional y up', () => {
    expect(formatDragCoord({ x: 120, y: 80.7 })).toBe('(120, 81)');
  });

  it('rounds both coordinates', () => {
    expect(formatDragCoord({ x: 120.4, y: 80.7 })).toBe('(120, 81)');
  });

  it('handles negative coordinates', () => {
    expect(formatDragCoord({ x: -15.2, y: -7.8 })).toBe('(-15, -8)');
  });

  it('handles zero coordinates', () => {
    expect(formatDragCoord({ x: 0, y: 0 })).toBe('(0, 0)');
  });

  it('rounds 0.5 up (standard rounding)', () => {
    expect(formatDragCoord({ x: 10.5, y: 20.5 })).toBe('(11, 21)');
  });

  it('handles large coordinates', () => {
    expect(formatDragCoord({ x: 1200.9, y: 800.1 })).toBe('(1201, 800)');
  });
});
