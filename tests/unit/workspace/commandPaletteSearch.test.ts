import { describe, expect, it } from 'vitest';

import type {
  ElementId,
  ModelElement,
  PartDefinitionElement,
  PartUsageElement,
  RequirementElement,
} from '@/model';
import {
  COMMAND_PALETTE_RESULT_CAP,
  searchElements,
} from '@/workspace/commandPaletteSearch';
import type { Diagram, DiagramId } from '@/workspace';

function id(s: string): ElementId {
  return s as ElementId;
}
function did(s: string): DiagramId {
  return s as DiagramId;
}

function partDef(idStr: string, name: string): PartDefinitionElement {
  return {
    id: id(idStr),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    isAbstract: false,
  };
}

function partUsage(
  idStr: string,
  name: string,
  defId: string,
): PartUsageElement {
  return {
    id: id(idStr),
    kind: 'PartUsage',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    definitionId: id(defId),
  };
}

function requirement(idStr: string, name: string): RequirementElement {
  return {
    id: id(idStr),
    kind: 'Requirement',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    reqId: 'REQ-1',
    text: '',
    priority: 'medium',
    status: 'draft',
  };
}

const ROOT_ID = id('root-pkg');

const bdd: Diagram = {
  id: did('d-bdd'),
  viewpointId: 'bdd' as Diagram['viewpointId'],
  name: 'BDD',
  positions: {
    [id('alpha')]: { x: 0, y: 0 },
    [id('beta')]: { x: 0, y: 0 },
  },
  context: { kind: 'package', id: ROOT_ID },
};

const ibd: Diagram = {
  id: did('d-ibd'),
  viewpointId: 'ibd' as Diagram['viewpointId'],
  name: 'Alpha IBD',
  positions: { [id('alpha-usage')]: { x: 0, y: 0 } },
  context: { kind: 'partDefinition', id: id('alpha') },
};

const elements: readonly ModelElement[] = [
  partDef('alpha', 'Alpha'),
  partDef('beta', 'Beta'),
  partUsage('alpha-usage', 'AlphaUsage', 'alpha'),
  // Orphan element — no diagram has it in positions; excluded from results.
  requirement('orphan-req', 'OrphanReq'),
];

describe('searchElements', () => {
  it('returns [] for empty / whitespace query', () => {
    expect(searchElements('', elements, [bdd, ibd])).toEqual([]);
    expect(searchElements('   ', elements, [bdd, ibd])).toEqual([]);
  });

  it('matches by name substring, case-insensitive', () => {
    const matches = searchElements('alpha', elements, [bdd, ibd]);
    const ids = matches.map((m) => m.id);
    expect(ids).toContain('alpha');
    expect(ids).toContain('alpha-usage');
    expect(ids).not.toContain('beta');
  });

  it('matches by id substring as well as name', () => {
    const matches = searchElements('usage', elements, [bdd, ibd]);
    expect(matches.map((m) => m.id)).toEqual(['alpha-usage']);
  });

  it('excludes elements not present on any diagram', () => {
    const matches = searchElements('orphan', elements, [bdd, ibd]);
    expect(matches).toEqual([]);
  });

  it('reports the first diagram that contains the element', () => {
    const matches = searchElements('alpha', elements, [bdd, ibd]);
    const alpha = matches.find((m) => m.id === 'alpha');
    const alphaUsage = matches.find((m) => m.id === 'alpha-usage');
    expect(alpha?.diagramId).toBe(bdd.id);
    expect(alphaUsage?.diagramId).toBe(ibd.id);
    expect(alpha?.diagramName).toBe('BDD');
  });

  it('caps results at COMMAND_PALETTE_RESULT_CAP', () => {
    const many: ModelElement[] = [];
    const positions: Record<ElementId, { x: number; y: number }> = {};
    for (let i = 0; i < COMMAND_PALETTE_RESULT_CAP + 25; i += 1) {
      const e = partDef(`x-${i}`, `Xenon${i}`);
      many.push(e);
      positions[e.id] = { x: 0, y: 0 };
    }
    const d: Diagram = {
      id: did('d-many'),
      viewpointId: 'bdd' as Diagram['viewpointId'],
      name: 'Many',
      positions,
      context: { kind: 'package', id: ROOT_ID },
    };
    const matches = searchElements('xenon', many, [d]);
    expect(matches.length).toBe(COMMAND_PALETTE_RESULT_CAP);
  });
});
