import { describe, expect, it } from 'vitest';

import type { EdgeId, ElementId, ModelEdge, ModelElement } from '@/model';
import { bddViewpoint } from '@/viewpoints';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
} from '@/viewpoints/bdd/BlockNode';
import { buildDiagramSvg, EXPORT_SVG_NODE_CLASS, EXPORT_SVG_EDGE_CLASS } from '@/workspace/export/svg';
import type { NodePosition } from '@/workspace/diagram';

const mk = <T extends string>(s: string): T => s as unknown as T;

function makeBlock(id: string, name: string): ModelElement {
  return {
    id: mk<ElementId>(id),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    isAbstract: false,
  };
}

function makeComposition(id: string, source: string, target: string): ModelEdge {
  return {
    id: mk<EdgeId>(id),
    kind: 'Composition',
    sourceId: mk<ElementId>(source),
    targetId: mk<ElementId>(target),
  };
}

function makeGeneralization(id: string, source: string, target: string): ModelEdge {
  return {
    id: mk<EdgeId>(id),
    kind: 'Generalization',
    sourceId: mk<ElementId>(source),
    targetId: mk<ElementId>(target),
  };
}

describe('buildDiagramSvg', () => {
  const positions: Record<ElementId, NodePosition> = {
    [mk<ElementId>('a')]: { x: 40, y: 60 },
    [mk<ElementId>('b')]: { x: 320, y: 240 },
  };

  it('returns a well-formed XML document with xmlns', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'Engine'), makeBlock('b', 'Cylinder')],
      edges: [makeComposition('e1', 'a', 'b')],
      positions,
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg')).toBe(true);
    expect(svg).toMatch(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    // Parsed shape: must be valid for DOMParser.
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.nodeName).toBe('svg');
  });

  it('renders one group per node with the node class and contains the label text', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'Engine'), makeBlock('b', 'Cylinder')],
      edges: [],
      positions,
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const nodes = doc.getElementsByClassName(EXPORT_SVG_NODE_CLASS);
    expect(nodes).toHaveLength(2);
    expect(svg).toContain('>Engine<');
    expect(svg).toContain('>Cylinder<');
  });

  it('renders one group per edge with the edge class and a non-empty path d-attribute', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'A'), makeBlock('b', 'B')],
      edges: [makeComposition('e1', 'a', 'b'), makeGeneralization('e2', 'a', 'b')],
      positions,
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const edges = doc.getElementsByClassName(EXPORT_SVG_EDGE_CLASS);
    expect(edges).toHaveLength(2);
    for (const edge of Array.from(edges)) {
      const path = edge.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('d')).toMatch(/^M/);
    }
  });

  it('XML-escapes element labels so &/</>/" do not break the document', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'A&B <c> "d"'), makeBlock('b', 'plain')],
      edges: [],
      positions,
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    expect(svg).toContain('A&amp;B &lt;c&gt; &quot;d&quot;');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });

  it('drops edges whose source or target is missing from positions', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'A')],
      // 'b' has no position entry
      edges: [makeComposition('e1', 'a', 'b')],
      positions: { [mk<ElementId>('a')]: { x: 0, y: 0 } },
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.getElementsByClassName(EXPORT_SVG_EDGE_CLASS)).toHaveLength(0);
  });

  it('sizes the viewBox to fit all nodes with padding so nothing is clipped', () => {
    const svg = buildDiagramSvg({
      elements: [makeBlock('a', 'A'), makeBlock('b', 'B')],
      edges: [],
      positions: {
        [mk<ElementId>('a')]: { x: 100, y: 200 },
        [mk<ElementId>('b')]: { x: 500, y: 600 },
      },
      viewpoint: bddViewpoint,
      nodeWidth: 200,
      nodeHeight: 80,
    });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    const viewBox = root.getAttribute('viewBox');
    expect(viewBox).not.toBeNull();
    const parts = viewBox!.split(/\s+/).map(Number);
    expect(parts).toHaveLength(4);
    const [vx, vy, vw, vh] = parts as [number, number, number, number];
    expect(vx).toBeLessThanOrEqual(100);
    expect(vy).toBeLessThanOrEqual(200);
    expect(vx + vw).toBeGreaterThanOrEqual(700); // 500 + 200
    expect(vy + vh).toBeGreaterThanOrEqual(680); // 600 + 80
  });

  it('handles the empty-diagram case with a minimal but valid SVG', () => {
    const svg = buildDiagramSvg({
      elements: [],
      edges: [],
      positions: {},
      viewpoint: bddViewpoint,
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.getElementsByClassName(EXPORT_SVG_NODE_CLASS)).toHaveLength(0);
    expect(doc.getElementsByClassName(EXPORT_SVG_EDGE_CLASS)).toHaveLength(0);
  });
});
