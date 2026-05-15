import type { ElementId } from '@/model';

import type { DiagramId } from '../diagram';

import type {
  ContainmentElementNode,
  ContainmentTreeNode,
} from './buildContainmentTree';

export type TreeFilterKey = `el:${ElementId}` | `dg:${DiagramId}`;

export function tokenizeFilter(query: string): readonly string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function haystackFor(node: ContainmentTreeNode): string {
  if (node.kind === 'element') {
    return `${node.element.name} ${node.element.kind}`.toLowerCase();
  }
  return node.diagram.name.toLowerCase();
}

function nodeMatchesTokens(
  node: ContainmentTreeNode,
  tokens: readonly string[],
): boolean {
  const h = haystackFor(node);
  return tokens.every((t) => h.includes(t));
}

function keyFor(node: ContainmentTreeNode): TreeFilterKey {
  return node.kind === 'element'
    ? (`el:${node.element.id}` as TreeFilterKey)
    : (`dg:${node.diagram.id}` as TreeFilterKey);
}

// Computes the set of FocusKeys that should remain visible when the given
// tokens are applied. A node is visible if it matches every token (AND
// semantics across tokens; each token is a case-insensitive substring match
// against the element's "<name> <kind>" or the diagram's name) OR any
// descendant matches. Returns null when `tokens` is empty so callers can
// short-circuit and bypass filtering entirely.
export function computeFilteredKeys(
  root: ContainmentElementNode | null,
  tokens: readonly string[],
): ReadonlySet<TreeFilterKey> | null {
  if (tokens.length === 0) return null;
  if (!root) return new Set();
  const visible = new Set<TreeFilterKey>();
  function visit(node: ContainmentTreeNode): boolean {
    let descendantMatch = false;
    if (node.kind === 'element') {
      for (const child of node.children) {
        if (visit(child)) descendantMatch = true;
      }
    }
    const selfMatch = nodeMatchesTokens(node, tokens);
    if (selfMatch || descendantMatch) {
      visible.add(keyFor(node));
      return true;
    }
    return false;
  }
  visit(root);
  return visible;
}
