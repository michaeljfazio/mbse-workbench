import { describe, expect, it } from 'vitest';

import type {
  CompositionEdge,
  GeneralizationEdge,
  PartDefinitionElement,
} from '@/model';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
  dagreLayout,
} from '@/viewpoints';

import { mkEdgeId, mkElementId } from '../../model/helpers';

function block(name: string, id: string): PartDefinitionElement {
  return {
    id: mkElementId(id),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    isAbstract: false,
  };
}

function composition(sourceId: string, targetId: string, id: string): CompositionEdge {
  return {
    id: mkEdgeId(id),
    kind: 'Composition',
    sourceId: mkElementId(sourceId),
    targetId: mkElementId(targetId),
  };
}

function generalization(
  sourceId: string,
  targetId: string,
  id: string,
): GeneralizationEdge {
  return {
    id: mkEdgeId(id),
    kind: 'Generalization',
    sourceId: mkElementId(sourceId),
    targetId: mkElementId(targetId),
  };
}

describe('dagreLayout', () => {
  it('returns a position for every input element', () => {
    const elements = [block('A', 'a'), block('B', 'b'), block('C', 'c')];
    const edges = [composition('a', 'b', 'ab'), composition('a', 'c', 'ac')];

    const positions = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });

    expect(positions.size).toBe(3);
    expect(positions.get(mkElementId('a'))).toBeDefined();
    expect(positions.get(mkElementId('b'))).toBeDefined();
    expect(positions.get(mkElementId('c'))).toBeDefined();
  });

  it('is deterministic across calls with the same inputs', () => {
    const elements = [block('A', 'a'), block('B', 'b'), block('C', 'c')];
    const edges = [composition('a', 'b', 'ab'), composition('a', 'c', 'ac')];

    const first = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    const second = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });

    expect(Array.from(first.entries()).sort()).toEqual(
      Array.from(second.entries()).sort(),
    );
  });

  it('places parent above children for TB rankdir', () => {
    const elements = [block('A', 'a'), block('B', 'b'), block('C', 'c')];
    const edges = [composition('a', 'b', 'ab'), composition('a', 'c', 'ac')];

    const positions = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });

    const pa = positions.get(mkElementId('a'))!;
    const pb = positions.get(mkElementId('b'))!;
    const pc = positions.get(mkElementId('c'))!;

    expect(pa.y).toBeLessThan(pb.y);
    expect(pa.y).toBeLessThan(pc.y);
  });

  it('produces non-overlapping bounding rectangles for connected nodes', () => {
    const elements = [block('A', 'a'), block('B', 'b'), block('C', 'c')];
    const edges = [composition('a', 'b', 'ab'), composition('a', 'c', 'ac')];

    const positions = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });

    const rects = Array.from(positions.entries()).map(([id, pos]) => ({
      id,
      left: pos.x,
      top: pos.y,
      right: pos.x + BDD_BLOCK_WIDTH,
      bottom: pos.y + BDD_BLOCK_HEIGHT,
    }));

    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]!;
        const b = rects[j]!;
        const overlap =
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top;
        expect(overlap).toBe(false);
      }
    }
  });

  it('ignores edges whose endpoints are not in the elements list', () => {
    const elements = [block('A', 'a'), block('B', 'b')];
    const edges = [
      composition('a', 'b', 'ab'),
      // Dangling: 'ghost' is not in `elements`.
      composition('a', 'ghost', 'ag'),
    ];

    expect(() =>
      dagreLayout(elements, edges, {
        nodeWidth: BDD_BLOCK_WIDTH,
        nodeHeight: BDD_BLOCK_HEIGHT,
      }),
    ).not.toThrow();
  });

  it('handles an empty graph without error', () => {
    const positions = dagreLayout([], [], {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    expect(positions.size).toBe(0);
  });

  it('respects rankdir LR', () => {
    const elements = [block('A', 'a'), block('B', 'b')];
    const edges = [generalization('a', 'b', 'ab')];

    const positions = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
      rankdir: 'LR',
    });

    const pa = positions.get(mkElementId('a'))!;
    const pb = positions.get(mkElementId('b'))!;
    expect(pa.x).toBeLessThan(pb.x);
  });
});
