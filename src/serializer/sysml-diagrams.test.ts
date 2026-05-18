import { describe, expect, it } from 'vitest';
import type {
  ElementId,
  ModelElement,
  OwnerRole,
  PackageElement,
  ProjectId,
} from '@/model';
import { EMPTY_COMMAND_HISTORY, type Project } from '@/repository';
import type { Diagram, DiagramId } from '@/workspace/diagram';
import type { ViewpointId } from '@/viewpoints';
import { serializeProject } from './sysml';
import { parseSysmlText } from '@/parser/sysml';

function eid(s: string): ElementId {
  return s as ElementId;
}

function did(s: string): DiagramId {
  return s as DiagramId;
}

const R = eid('root-pkg-id');
const rootPkg: PackageElement = {
  id: R,
  kind: 'Package',
  name: 'FlightControl',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
};

type Loose<E extends ModelElement> = Omit<E, 'ownerId' | 'ownerRole' | 'ownerIndex'>;

function own<E extends ModelElement>(
  e: Loose<E>,
  ownerId: ElementId,
  role: OwnerRole,
  index: number,
): E {
  return { ...e, ownerId, ownerRole: role, ownerIndex: index } as E;
}

function buildProject(
  elements: readonly ModelElement[],
  diagrams: readonly Diagram[],
  name = 'TestProject',
): Project {
  return {
    id: 'P1' as ProjectId,
    name,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    rootId: R,
    elements: [rootPkg, ...elements],
    edges: [],
    diagrams,
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

describe('serializeProject — view blocks for diagrams', () => {
  it('emits no view blocks when diagrams is empty', () => {
    const project = buildProject([], []);
    const text = serializeProject(project);
    expect(text).not.toContain('view ');
    expect(text).not.toContain('expose ');
    expect(text).not.toContain('@viewpoint');
  });

  it('emits a single view block for a BDD on the root package context', () => {
    const diagram: Diagram = {
      id: did('diag-bdd-1'),
      viewpointId: 'bdd' as ViewpointId,
      name: 'Main BDD',
      positions: {},
      context: { kind: 'package', id: R },
    };
    const project = buildProject([], [diagram]);
    const text = serializeProject(project);

    expect(text).toContain('// @viewpoint bdd');
    expect(text).toContain('view <Main BDD> {');
    expect(text).toContain('// id: diag-bdd-1');
    expect(text).toContain('expose FlightControl;');
    expect(text).toContain('}');
  });

  it('emits two view blocks for two diagrams on the same package', () => {
    const diagA: Diagram = {
      id: did('diag-a'),
      viewpointId: 'bdd' as ViewpointId,
      name: 'Alpha',
      positions: {},
      context: { kind: 'package', id: R },
    };
    const diagB: Diagram = {
      id: did('diag-b'),
      viewpointId: 'ibd' as ViewpointId,
      name: 'Beta',
      positions: {},
      context: { kind: 'package', id: R },
    };
    const project = buildProject([], [diagA, diagB]);
    const text = serializeProject(project);

    // Both diagrams appear
    expect(text).toContain('view Alpha {');
    expect(text).toContain('view Beta {');
    // The set of viewpointIds matches
    expect(text).toMatch(/\/\/ @viewpoint bdd/);
    expect(text).toMatch(/\/\/ @viewpoint ibd/);
  });

  it('emits quoted-ident for a diagram name with whitespace', () => {
    const diagram: Diagram = {
      id: did('diag-ws'),
      viewpointId: 'bdd' as ViewpointId,
      name: 'My Fancy Diagram',
      positions: {},
      context: { kind: 'package', id: R },
    };
    const project = buildProject([], [diagram]);
    const text = serializeProject(project);

    // Whitespace name must use <...> quoting from PR #448
    expect(text).toContain('view <My Fancy Diagram> {');
  });

  it('emits the full qualified path for a PartDefinition context', () => {
    const partDef = own<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      { id: eid('pfc-id'), kind: 'PartDefinition', name: 'PFC', isAbstract: false },
      R,
      'member',
      0,
    );
    const diagram: Diagram = {
      id: did('diag-ibd-1'),
      viewpointId: 'ibd' as ViewpointId,
      name: 'PFC IBD',
      positions: {},
      context: { kind: 'partDefinition', id: eid('pfc-id') },
    };
    const project = buildProject([partDef], [diagram]);
    const text = serializeProject(project);

    expect(text).toContain('// @viewpoint ibd');
    expect(text).toContain('view <PFC IBD> {');
    // Path: root-pkg (FlightControl) :: partDef (PFC)
    expect(text).toContain('expose FlightControl::PFC;');
  });

  it('silently drops a diagram whose context element is missing from byId', () => {
    const diagram: Diagram = {
      id: did('diag-orphan'),
      viewpointId: 'bdd' as ViewpointId,
      name: 'Orphan',
      positions: {},
      // This id does not exist in project.elements
      context: { kind: 'package', id: eid('nonexistent-id') },
    };
    const project = buildProject([], [diagram]);
    const text = serializeProject(project);

    expect(text).not.toContain('view ');
    expect(text).not.toContain('Orphan');
  });

  it('round-trips two diagrams: BDD on root package and IBD on PartDefinition', () => {
    const partDef = own<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      { id: eid('rt-part-id'), kind: 'PartDefinition', name: 'SubSystem', isAbstract: false },
      R,
      'member',
      0,
    );
    const diagBdd: Diagram = {
      id: did('rt-bdd-id'),
      viewpointId: 'bdd' as ViewpointId,
      name: 'Top BDD',
      positions: {},
      context: { kind: 'package', id: R },
    };
    const diagIbd: Diagram = {
      id: did('rt-ibd-id'),
      viewpointId: 'ibd' as ViewpointId,
      name: 'SubSystem IBD',
      positions: {},
      context: { kind: 'partDefinition', id: eid('rt-part-id') },
    };
    const project = buildProject([partDef], [diagBdd, diagIbd]);
    const text = serializeProject(project);
    const result = parseSysmlText(text);

    if (!result.ok) {
      throw new Error('parse failed: ' + JSON.stringify(result.errors));
    }

    const parsedDiagrams = result.value.diagrams ?? [];
    expect(parsedDiagrams).toHaveLength(2);

    const bddOut = parsedDiagrams.find((d) => d.name === 'Top BDD');
    expect(bddOut).toBeDefined();
    expect(bddOut?.viewpointId).toBe('bdd');
    expect(bddOut?.context.kind).toBe('package');
    // id preserved via // id: comment
    expect(bddOut?.id).toBe('rt-bdd-id');

    const ibdOut = parsedDiagrams.find((d) => d.name === 'SubSystem IBD');
    expect(ibdOut).toBeDefined();
    expect(ibdOut?.viewpointId).toBe('ibd');
    expect(ibdOut?.context.kind).toBe('partDefinition');
    expect(ibdOut?.id).toBe('rt-ibd-id');
  });
});
