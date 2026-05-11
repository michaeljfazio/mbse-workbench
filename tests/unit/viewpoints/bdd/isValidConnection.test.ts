import { describe, expect, it } from 'vitest';
import type { Connection } from '@xyflow/react';

import {
  createElementRegistry,
  type ElementId,
  type ElementRegistry,
  type PartDefinitionElement,
  type RequirementElement,
} from '@/model';
import { isValidBddConnection } from '@/viewpoints';

import { mkElementId } from '../../model/helpers';

function block(id: ElementId, name: string): PartDefinitionElement {
  return {
    id,
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

function requirement(id: ElementId, name: string): RequirementElement {
  return {
    id,
    kind: 'Requirement',
    name,
    text: 'spec',
    priority: 'medium',
    status: 'draft',
  };
}

function setup(): { registry: ElementRegistry; a: ElementId; b: ElementId; r: ElementId } {
  const registry = createElementRegistry();
  const a = mkElementId('a');
  const b = mkElementId('b');
  const r = mkElementId('r');
  registry.add(block(a, 'A'));
  registry.add(block(b, 'B'));
  registry.add(requirement(r, 'R'));
  return { registry, a, b, r };
}

function conn(source: ElementId, target: ElementId): Connection {
  return { source, target, sourceHandle: 'bottom', targetHandle: 'top' };
}

describe('isValidBddConnection', () => {
  it('accepts a connection between two distinct PartDefinitions', () => {
    const { registry, a, b } = setup();
    expect(isValidBddConnection(conn(a, b), registry)).toBe(true);
  });

  it('rejects a self-connection on the same block', () => {
    const { registry, a } = setup();
    expect(isValidBddConnection(conn(a, a), registry)).toBe(false);
  });

  it('rejects a connection where the source is missing from the registry', () => {
    const { registry, b } = setup();
    expect(isValidBddConnection(conn(mkElementId('ghost'), b), registry)).toBe(false);
  });

  it('rejects a connection where the target is missing from the registry', () => {
    const { registry, a } = setup();
    expect(isValidBddConnection(conn(a, mkElementId('ghost')), registry)).toBe(false);
  });

  it('rejects a connection where one endpoint is not a PartDefinition', () => {
    const { registry, a, r } = setup();
    expect(isValidBddConnection(conn(a, r), registry)).toBe(false);
    expect(isValidBddConnection(conn(r, a), registry)).toBe(false);
  });

  it('rejects a connection with an empty source or target id', () => {
    const { registry, a } = setup();
    expect(
      isValidBddConnection(
        { source: '' as ElementId, target: a, sourceHandle: null, targetHandle: 'top' },
        registry,
      ),
    ).toBe(false);
    expect(
      isValidBddConnection(
        { source: a, target: '' as ElementId, sourceHandle: 'bottom', targetHandle: null },
        registry,
      ),
    ).toBe(false);
  });
});
