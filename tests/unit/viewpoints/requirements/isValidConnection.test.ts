import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ElementId,
  type ModelElement,
  type RequirementTraceKind,
} from '@/model';
import {
  isValidRequirementTraceConnection,
  validTraceKindsFor,
} from '@/viewpoints';

import { mkElementId } from '../../model/helpers';

function mkReq(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'Requirement',
    name: idSlug,
    text: '',
    priority: 'medium',
    status: 'draft',
  };
}

function mkBlock(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'PartDefinition',
    name: idSlug,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

function mkPort(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'PortDefinition',
    name: idSlug,
    direction: 'inout',
  };
}

function setup(elements: readonly ModelElement[]) {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

const KINDS: readonly RequirementTraceKind[] = [
  'derive',
  'satisfy',
  'verify',
  'refine',
];

describe('isValidRequirementTraceConnection', () => {
  it('rejects when source or target is missing', () => {
    const registry = setup([mkReq('r1')]);
    for (const kind of KINDS) {
      expect(
        isValidRequirementTraceConnection(
          // Connection.source is statically `string`, but at runtime React
          // Flow can hand us a falsy value while a drag is in flight.
          { source: '', target: 'r1', sourceHandle: null, targetHandle: null },
          registry,
          kind,
        ),
      ).toBe(false);
      expect(
        isValidRequirementTraceConnection(
          { source: 'r1', target: '', sourceHandle: null, targetHandle: null },
          registry,
          kind,
        ),
      ).toBe(false);
    }
  });

  it('rejects self-loops', () => {
    const registry = setup([mkReq('r1')]);
    for (const kind of KINDS) {
      expect(
        isValidRequirementTraceConnection(
          { source: 'r1', target: 'r1', sourceHandle: null, targetHandle: null },
          registry,
          kind,
        ),
      ).toBe(false);
    }
  });

  it('rejects when source is not a Requirement', () => {
    const registry = setup([mkBlock('b1'), mkReq('r1')]);
    for (const kind of KINDS) {
      expect(
        isValidRequirementTraceConnection(
          { source: 'b1', target: 'r1', sourceHandle: null, targetHandle: null },
          registry,
          kind,
        ),
      ).toBe(false);
    }
  });

  it('derive and refine require both endpoints to be Requirements', () => {
    const registry = setup([mkReq('r1'), mkReq('r2'), mkBlock('b1')]);
    expect(
      isValidRequirementTraceConnection(
        { source: 'r1', target: 'r2', sourceHandle: null, targetHandle: null },
        registry,
        'derive',
      ),
    ).toBe(true);
    expect(
      isValidRequirementTraceConnection(
        { source: 'r1', target: 'r2', sourceHandle: null, targetHandle: null },
        registry,
        'refine',
      ),
    ).toBe(true);
    expect(
      isValidRequirementTraceConnection(
        { source: 'r1', target: 'b1', sourceHandle: null, targetHandle: null },
        registry,
        'derive',
      ),
    ).toBe(false);
    expect(
      isValidRequirementTraceConnection(
        { source: 'r1', target: 'b1', sourceHandle: null, targetHandle: null },
        registry,
        'refine',
      ),
    ).toBe(false);
  });

  it('satisfy and verify accept the ADR 0004 target kinds', () => {
    const allowedTargets: readonly ModelElement[] = [
      mkReq('r2'),
      mkBlock('b1'),
      // PartUsage / Action / State / UseCase shapes — fake but well-typed.
      {
        id: mkElementId('pu1'),
        kind: 'PartUsage',
        name: 'pu1',
        definitionId: mkElementId('b1'),
        portUsageIds: [],
      } as ModelElement,
      {
        id: mkElementId('ad1'),
        kind: 'ActionDefinition',
        name: 'ad1',
        parameterIds: [],
      } as ModelElement,
      {
        id: mkElementId('au1'),
        kind: 'ActionUsage',
        name: 'au1',
      } as ModelElement,
      {
        id: mkElementId('sd1'),
        kind: 'StateDefinition',
        name: 'sd1',
      } as ModelElement,
      {
        id: mkElementId('su1'),
        kind: 'StateUsage',
        name: 'su1',
      } as ModelElement,
      {
        id: mkElementId('uc1'),
        kind: 'UseCase',
        name: 'uc1',
      } as ModelElement,
    ];
    const registry = setup([mkReq('r1'), ...allowedTargets]);
    for (const target of allowedTargets) {
      for (const kind of ['satisfy', 'verify'] as const) {
        expect(
          isValidRequirementTraceConnection(
            {
              source: 'r1',
              target: target.id as unknown as string,
              sourceHandle: null,
              targetHandle: null,
            },
            registry,
            kind,
          ),
        ).toBe(true);
      }
    }
  });

  it('satisfy/verify reject targets outside the allowed list', () => {
    const registry = setup([mkReq('r1'), mkPort('p1')]);
    for (const kind of ['satisfy', 'verify'] as const) {
      expect(
        isValidRequirementTraceConnection(
          { source: 'r1', target: 'p1', sourceHandle: null, targetHandle: null },
          registry,
          kind,
        ),
      ).toBe(false);
    }
  });

  it('rejects when source or target id is not in the registry', () => {
    const registry = setup([mkReq('r1')]);
    expect(
      isValidRequirementTraceConnection(
        { source: 'r1', target: 'ghost' as ElementId, sourceHandle: null, targetHandle: null },
        registry,
        'satisfy',
      ),
    ).toBe(false);
    expect(
      isValidRequirementTraceConnection(
        { source: 'ghost' as ElementId, target: 'r1', sourceHandle: null, targetHandle: null },
        registry,
        'satisfy',
      ),
    ).toBe(false);
  });
});

describe('validTraceKindsFor', () => {
  it('returns all four kinds for Requirement → Requirement', () => {
    const registry = setup([mkReq('r1'), mkReq('r2')]);
    const kinds = validTraceKindsFor(
      { source: 'r1', target: 'r2', sourceHandle: null, targetHandle: null },
      registry,
    );
    expect([...kinds].sort()).toEqual(['derive', 'refine', 'satisfy', 'verify']);
  });

  it('returns only satisfy + verify for Requirement → PartDefinition', () => {
    const registry = setup([mkReq('r1'), mkBlock('b1')]);
    const kinds = validTraceKindsFor(
      { source: 'r1', target: 'b1', sourceHandle: null, targetHandle: null },
      registry,
    );
    expect([...kinds].sort()).toEqual(['satisfy', 'verify']);
  });

  it('returns [] when source is not a Requirement', () => {
    const registry = setup([mkBlock('b1'), mkReq('r1')]);
    expect(
      validTraceKindsFor(
        { source: 'b1', target: 'r1', sourceHandle: null, targetHandle: null },
        registry,
      ),
    ).toEqual([]);
  });
});
