import { describe, expect, it } from 'vitest';

import type { ElementId, ModelElement, PackageElement, PartDefinitionElement } from '@/model';
import type { ViewpointId } from '@/viewpoints';
import {
  buildContainmentTree,
  type ContainmentElementNode,
  type ContainmentRepresentationNode,
} from '@/workspace/tree/buildContainmentTree';
import type { Diagram, DiagramId } from '@/workspace';

const id = (s: string): ElementId => s as ElementId;
const did = (s: string): DiagramId => s as DiagramId;
const vp = 'bdd' as ViewpointId;

function pkg(name: string, ownerId: ElementId | null, ownerIndex = 0): PackageElement {
  return {
    id: id(name),
    kind: 'Package',
    name,
    ownerId,
    ownerRole: 'member',
    ownerIndex,
  };
}

function partDef(
  name: string,
  ownerId: ElementId,
  ownerIndex = 0,
): PartDefinitionElement {
  return {
    id: id(name),
    kind: 'PartDefinition',
    name,
    ownerId,
    ownerRole: 'member',
    ownerIndex,
    isAbstract: false,
  };
}

function diagram(name: string, ctx?: Diagram['context'], idStr = name): Diagram {
  return {
    id: did(idStr),
    viewpointId: vp,
    name,
    positions: {},
    ...(ctx ? { context: ctx } : {}),
  };
}

function expectElement(node: unknown): asserts node is ContainmentElementNode {
  expect((node as { kind: string }).kind).toBe('element');
}

describe('buildContainmentTree', () => {
  it('returns null when rootId is missing', () => {
    expect(buildContainmentTree({ elements: [], diagrams: [], rootId: null })).toBeNull();
    expect(
      buildContainmentTree({ elements: [], diagrams: [], rootId: undefined }),
    ).toBeNull();
  });

  it('returns null when root element is not in elements', () => {
    expect(
      buildContainmentTree({ elements: [], diagrams: [], rootId: id('missing') }),
    ).toBeNull();
  });

  it('roots the tree at the project root and skips its ownerIndex sort vs siblings', () => {
    const root = pkg('root', null);
    const tree = buildContainmentTree({ elements: [root], diagrams: [], rootId: root.id });
    expect(tree?.element.id).toBe(root.id);
    expect(tree?.children).toEqual([]);
  });

  it('nests element children under their ownerId, sorted by ownerIndex', () => {
    const root = pkg('root', null);
    const a = partDef('a', root.id, 2);
    const b = partDef('b', root.id, 0);
    const c = partDef('c', root.id, 1);

    const tree = buildContainmentTree({
      elements: [root, a, b, c],
      diagrams: [],
      rootId: root.id,
    });

    expect(tree?.children.map((n) => (n.kind === 'element' ? n.element.id : null))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('breaks ownerIndex ties by id for determinism', () => {
    const root = pkg('root', null);
    const a = partDef('a', root.id, 0);
    const b = partDef('b', root.id, 0);
    const tree = buildContainmentTree({
      elements: [root, b, a],
      diagrams: [],
      rootId: root.id,
    });
    expect(tree?.children.map((n) => (n.kind === 'element' ? n.element.id : null))).toEqual([
      'a',
      'b',
    ]);
  });

  it('builds a deep containment chain', () => {
    const root = pkg('root', null);
    const middle = pkg('middle', root.id);
    const leaf = partDef('leaf', middle.id);

    const tree = buildContainmentTree({
      elements: [root, middle, leaf],
      diagrams: [],
      rootId: root.id,
    });

    const middleNode = tree?.children[0];
    expectElement(middleNode);
    expect(middleNode.element.id).toBe('middle');
    const leafNode = middleNode.children[0];
    expectElement(leafNode);
    expect(leafNode.element.id).toBe('leaf');
    expect(leafNode.children).toEqual([]);
  });

  it('drops elements whose ownerId points to a missing parent (orphan-tolerance)', () => {
    const root = pkg('root', null);
    const orphan = partDef('orphan', id('ghost'));
    const tree = buildContainmentTree({
      elements: [root, orphan],
      diagrams: [],
      rootId: root.id,
    });
    expect(tree?.children).toEqual([]);
  });

  it('nests representations under their context element after element children', () => {
    const root = pkg('root', null);
    const part = partDef('part', root.id);
    const ibd = diagram('IBD-1', { kind: 'partDefinition', id: part.id }, 'd-ibd');

    const tree = buildContainmentTree({
      elements: [root, part],
      diagrams: [ibd],
      rootId: root.id,
    });

    const partNode = tree?.children[0];
    expectElement(partNode);
    expect(partNode.children).toHaveLength(1);
    const rep = partNode.children[0] as ContainmentRepresentationNode;
    expect(rep.kind).toBe('representation');
    expect(rep.diagram.id).toBe('d-ibd');
  });

  it('attaches representations with no context to the root', () => {
    const root = pkg('root', null);
    const orphanDiagram = diagram('Stray', undefined, 'd-stray');
    const tree = buildContainmentTree({
      elements: [root],
      diagrams: [orphanDiagram],
      rootId: root.id,
    });
    expect(tree?.children).toHaveLength(1);
    expect(tree?.children[0]?.kind).toBe('representation');
  });

  it('attaches representations whose context.id targets a missing element to the root', () => {
    const root = pkg('root', null);
    const lost = diagram('Lost', { kind: 'partDefinition', id: id('ghost') }, 'd-lost');
    const tree = buildContainmentTree({
      elements: [root],
      diagrams: [lost],
      rootId: root.id,
    });
    expect(tree?.children).toHaveLength(1);
    expect(tree?.children[0]?.kind).toBe('representation');
  });

  it('renders representations after element children of the same parent', () => {
    const root = pkg('root', null);
    const child = partDef('child', root.id);
    const rep = diagram('Pkg-overview', { kind: 'package', id: root.id }, 'd-pkg');
    const tree = buildContainmentTree({
      elements: [root, child],
      diagrams: [rep],
      rootId: root.id,
    });
    expect(tree?.children.map((n) => n.kind)).toEqual(['element', 'representation']);
  });

  it('sorts sibling representations by name then id', () => {
    const root = pkg('root', null);
    const repA = diagram('Alpha', { kind: 'package', id: root.id }, 'd-2');
    const repB = diagram('Alpha', { kind: 'package', id: root.id }, 'd-1');
    const repC = diagram('Bravo', { kind: 'package', id: root.id }, 'd-3');
    const tree = buildContainmentTree({
      elements: [root],
      diagrams: [repC, repA, repB],
      rootId: root.id,
    });
    const ids = tree?.children.map((n) =>
      n.kind === 'representation' ? n.diagram.id : null,
    );
    expect(ids).toEqual(['d-1', 'd-2', 'd-3']);
  });

  it('does not include the root element among its own children even if rootId duplicates appear', () => {
    const root = pkg('root', null);
    const dup: ModelElement = { ...root, ownerId: root.id, ownerIndex: 5 };
    const tree = buildContainmentTree({
      elements: [root, dup],
      diagrams: [],
      rootId: root.id,
    });
    expect(tree?.children).toEqual([]);
  });
});
