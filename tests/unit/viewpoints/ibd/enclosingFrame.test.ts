import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type PartDefinitionElement,
  type PackageElement,
} from '@/model';
import {
  IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
  IBD_ENCLOSING_FRAME_PADDING,
  computeEnclosingFrameBounds,
  resolveIbdEnclosingFrameLabel,
} from '@/viewpoints/ibd/enclosingFrame';
import type { Diagram, DiagramId } from '@/workspace/diagram';

import { mkElementId } from '../../model/helpers';

describe('computeEnclosingFrameBounds', () => {
  it('returns null when there are no rects', () => {
    expect(computeEnclosingFrameBounds([])).toBeNull();
  });

  it('wraps a single rect with the default padding + header', () => {
    const result = computeEnclosingFrameBounds([
      { x: 100, y: 200, width: 200, height: 100 },
    ]);
    expect(result).toEqual({
      x: 100 - IBD_ENCLOSING_FRAME_PADDING,
      y: 200 - IBD_ENCLOSING_FRAME_PADDING - IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
      width: 200 + 2 * IBD_ENCLOSING_FRAME_PADDING,
      height: 100 + 2 * IBD_ENCLOSING_FRAME_PADDING + IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    });
  });

  it('wraps the union of multiple non-overlapping rects', () => {
    const result = computeEnclosingFrameBounds([
      { x: 0, y: 0, width: 200, height: 100 },
      { x: 400, y: 300, width: 200, height: 100 },
    ]);
    expect(result).toEqual({
      x: 0 - IBD_ENCLOSING_FRAME_PADDING,
      y: 0 - IBD_ENCLOSING_FRAME_PADDING - IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
      width: 600 + 2 * IBD_ENCLOSING_FRAME_PADDING,
      height: 400 + 2 * IBD_ENCLOSING_FRAME_PADDING + IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    });
  });

  it('honours custom padding and headerHeight options', () => {
    const result = computeEnclosingFrameBounds(
      [{ x: 10, y: 20, width: 100, height: 50 }],
      { padding: 16, headerHeight: 24 },
    );
    expect(result).toEqual({
      x: -6,
      y: 20 - 16 - 24,
      width: 100 + 32,
      height: 50 + 32 + 24,
    });
  });

  it('handles negative-coordinate rects', () => {
    const result = computeEnclosingFrameBounds([
      { x: -50, y: -100, width: 200, height: 100 },
    ]);
    expect(result).toEqual({
      x: -50 - IBD_ENCLOSING_FRAME_PADDING,
      y: -100 - IBD_ENCLOSING_FRAME_PADDING - IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
      width: 200 + 2 * IBD_ENCLOSING_FRAME_PADDING,
      height: 100 + 2 * IBD_ENCLOSING_FRAME_PADDING + IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    });
  });

  it('treats zero-sized rects as anchor points', () => {
    const result = computeEnclosingFrameBounds([
      { x: 100, y: 100, width: 0, height: 0 },
      { x: 200, y: 250, width: 0, height: 0 },
    ]);
    expect(result).toEqual({
      x: 100 - IBD_ENCLOSING_FRAME_PADDING,
      y: 100 - IBD_ENCLOSING_FRAME_PADDING - IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
      width: 100 + 2 * IBD_ENCLOSING_FRAME_PADDING,
      height: 150 + 2 * IBD_ENCLOSING_FRAME_PADDING + IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    });
  });
});

describe('resolveIbdEnclosingFrameLabel', () => {
  function makeDiagram(context: Diagram['context']): Diagram {
    return {
      id: 'd1' as DiagramId,
      viewpointId: 'ibd',
      name: 'Pump IBD',
      positions: {},
      context,
    };
  }

  it('returns the PartDefinition id + name when the context resolves', () => {
    const registry = createElementRegistry();
    const partDef: PartDefinitionElement = {
      id: mkElementId('def-pump'),
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Pump',
      isAbstract: false,
    };
    registry.add(partDef);
    const result = resolveIbdEnclosingFrameLabel(
      makeDiagram({ kind: 'partDefinition', id: partDef.id }),
      registry,
    );
    expect(result).toEqual({ id: partDef.id, name: 'Pump' });
  });

  it('returns null when context kind is not partDefinition', () => {
    const registry = createElementRegistry();
    const pkg: PackageElement = {
      id: mkElementId('pkg-root'),
      kind: 'Package',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Root',
    };
    registry.add(pkg);
    const result = resolveIbdEnclosingFrameLabel(
      makeDiagram({ kind: 'package', id: pkg.id }),
      registry,
    );
    expect(result).toBeNull();
  });

  it('returns null when the referenced id does not resolve', () => {
    const registry = createElementRegistry();
    const result = resolveIbdEnclosingFrameLabel(
      makeDiagram({ kind: 'partDefinition', id: mkElementId('missing-def') }),
      registry,
    );
    expect(result).toBeNull();
  });

  it('returns null when the referenced element is not a PartDefinition', () => {
    const registry = createElementRegistry();
    const pkg: PackageElement = {
      id: mkElementId('pkg-mislabeled'),
      kind: 'Package',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'NotAPart',
    };
    registry.add(pkg);
    const result = resolveIbdEnclosingFrameLabel(
      makeDiagram({ kind: 'partDefinition', id: pkg.id }),
      registry,
    );
    expect(result).toBeNull();
  });
});
