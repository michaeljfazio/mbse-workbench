import { describe, expect, it } from 'vitest';
import type { Connection } from '@xyflow/react';

import {
  createElementRegistry,
  type ElementId,
  type ElementRegistry,
  type PartDefinitionElement,
  type PartUsageElement,
  type PortDirection,
} from '@/model';
import {
  canonicalizeIbdConnection,
  isValidIbdConnection,
} from '@/viewpoints/ibd/isValidConnection';

import { mkElementId } from '../../model/helpers';

interface PortSeed {
  readonly id: string;
  readonly direction: PortDirection;
}

interface PartSeed {
  readonly id: string;
  readonly defId: string;
  readonly ports: readonly PortSeed[];
}

interface SeededRegistry {
  readonly registry: ElementRegistry;
  readonly partA: PartUsageElement;
  readonly partB: PartUsageElement;
  readonly portUsageByName: ReadonlyMap<string, ElementId>;
}

function seed(partA: PartSeed, partB: PartSeed): SeededRegistry {
  const registry = createElementRegistry();
  const portUsageByName = new Map<string, ElementId>();

  function buildPart(seed: PartSeed): PartUsageElement {
    const defId = mkElementId(seed.defId);
    const usageId = mkElementId(seed.id);
    const definition: PartDefinitionElement = {
      id: defId,
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: seed.defId,
      isAbstract: false,
    };
    const usage: PartUsageElement = {
      id: usageId,
      kind: 'PartUsage',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: seed.id,
      definitionId: defId,
    };
    registry.add(definition);
    registry.add(usage);
    let portIndex = 0;
    for (const port of seed.ports) {
      const portDefId = mkElementId(`${port.id}-def`);
      const portUsageId = mkElementId(`${port.id}-usage`);
      registry.add({
        id: portDefId,
        kind: 'PortDefinition',
        ownerId: defId,
        ownerRole: 'port',
        ownerIndex: portIndex,
        name: port.id,
        direction: port.direction,
      });
      registry.add({
        id: portUsageId,
        kind: 'PortUsage',
        ownerId: usageId,
        ownerRole: 'port',
        ownerIndex: portIndex,
        name: port.id,
        definitionId: portDefId,
      });
      portUsageByName.set(port.id, portUsageId);
      portIndex++;
    }
    return usage;
  }

  const partAUsage = buildPart(partA);
  const partBUsage = buildPart(partB);
  return { registry, partA: partAUsage, partB: partBUsage, portUsageByName };
}

function conn(
  sourcePart: ElementId,
  sourceHandle: ElementId,
  targetPart: ElementId,
  targetHandle: ElementId,
): Connection {
  return {
    source: sourcePart,
    target: targetPart,
    sourceHandle,
    targetHandle,
  };
}

describe('isValidIbdConnection', () => {
  it('accepts out → in between two distinct parts', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    const result = isValidIbdConnection(
      conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
      registry,
    );
    expect(result).toBe(true);
  });

  it('accepts in → out between two distinct parts (canonicalized on apply)', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'in' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'out' }] },
    );
    const result = isValidIbdConnection(
      conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
      registry,
    );
    expect(result).toBe(true);
  });

  it('accepts inout ↔ inout', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'inout' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'inout' }] },
    );
    const result = isValidIbdConnection(
      conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
      registry,
    );
    expect(result).toBe(true);
  });

  it.each([
    ['inout', 'in'],
    ['in', 'inout'],
    ['inout', 'out'],
    ['out', 'inout'],
  ] as const)('accepts %s ↔ %s', (src, tgt) => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: src }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: tgt }] },
    );
    const result = isValidIbdConnection(
      conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
      registry,
    );
    expect(result).toBe(true);
  });

  it('rejects in ↔ in', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'in' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    expect(
      isValidIbdConnection(
        conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
        registry,
      ),
    ).toBe(false);
  });

  it('rejects out ↔ out', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'out' }] },
    );
    expect(
      isValidIbdConnection(
        conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
        registry,
      ),
    ).toBe(false);
  });

  it('rejects connection between two ports on the same PartUsage', () => {
    const { registry, partA, portUsageByName } = seed(
      {
        id: 'a',
        defId: 'A',
        ports: [
          { id: 'p1', direction: 'out' },
          { id: 'p2', direction: 'in' },
        ],
      },
      { id: 'b', defId: 'B', ports: [] },
    );
    expect(
      isValidIbdConnection(
        conn(partA.id, portUsageByName.get('p1')!, partA.id, portUsageByName.get('p2')!),
        registry,
      ),
    ).toBe(false);
  });

  it('rejects connection when handle ids are identical', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    const shared = portUsageByName.get('p1')!;
    expect(
      isValidIbdConnection(conn(partA.id, shared, partB.id, shared), registry),
    ).toBe(false);
  });

  it('rejects connection when source or target handle is null', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    expect(
      isValidIbdConnection(
        {
          source: partA.id,
          target: partB.id,
          sourceHandle: null,
          targetHandle: portUsageByName.get('p2')!,
        },
        registry,
      ),
    ).toBe(false);
    expect(
      isValidIbdConnection(
        {
          source: partA.id,
          target: partB.id,
          sourceHandle: portUsageByName.get('p1')!,
          targetHandle: null,
        },
        registry,
      ),
    ).toBe(false);
  });

  it('rejects connection when source PartUsage is missing', () => {
    const { registry, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    expect(
      isValidIbdConnection(
        conn(
          mkElementId('ghost'),
          portUsageByName.get('p1')!,
          partB.id,
          portUsageByName.get('p2')!,
        ),
        registry,
      ),
    ).toBe(false);
  });

  it('rejects connection when sourceHandle is not in the source part portUsageIds', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    // p2 belongs to partB, not partA. Connection should fail.
    expect(
      isValidIbdConnection(
        conn(partA.id, portUsageByName.get('p2')!, partB.id, portUsageByName.get('p1')!),
        registry,
      ),
    ).toBe(false);
  });
});

describe('canonicalizeIbdConnection', () => {
  it('returns null for invalid connections', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'in' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    expect(
      canonicalizeIbdConnection(
        conn(partA.id, portUsageByName.get('p1')!, partB.id, portUsageByName.get('p2')!),
        registry,
      ),
    ).toBeNull();
  });

  it('swaps endpoints when source is in and target is out', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'in' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'out' }] },
    );
    const sourcePort = portUsageByName.get('p1')!;
    const targetPort = portUsageByName.get('p2')!;
    const result = canonicalizeIbdConnection(
      conn(partA.id, sourcePort, partB.id, targetPort),
      registry,
    );
    expect(result).toEqual({
      sourcePortUsageId: targetPort,
      targetPortUsageId: sourcePort,
    });
  });

  it('keeps endpoints when source is out and target is in', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'out' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'in' }] },
    );
    const sourcePort = portUsageByName.get('p1')!;
    const targetPort = portUsageByName.get('p2')!;
    expect(
      canonicalizeIbdConnection(
        conn(partA.id, sourcePort, partB.id, targetPort),
        registry,
      ),
    ).toEqual({
      sourcePortUsageId: sourcePort,
      targetPortUsageId: targetPort,
    });
  });

  it('keeps endpoints for inout ↔ inout (either direction is fine)', () => {
    const { registry, partA, partB, portUsageByName } = seed(
      { id: 'a', defId: 'A', ports: [{ id: 'p1', direction: 'inout' }] },
      { id: 'b', defId: 'B', ports: [{ id: 'p2', direction: 'inout' }] },
    );
    const sourcePort = portUsageByName.get('p1')!;
    const targetPort = portUsageByName.get('p2')!;
    expect(
      canonicalizeIbdConnection(
        conn(partA.id, sourcePort, partB.id, targetPort),
        registry,
      ),
    ).toEqual({
      sourcePortUsageId: sourcePort,
      targetPortUsageId: targetPort,
    });
  });
});
