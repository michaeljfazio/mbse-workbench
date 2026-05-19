import { describe, expect, it } from 'vitest';

import { createDiagramId } from '@/workspace/diagram';
import type { Diagram } from '@/workspace/diagram';
import { bddViewpoint } from '@/viewpoints';
import { createEdgeId, createElementId, createProjectId } from '@/model';
import type {
  CompositionEdge,
  ModelEdge,
  ModelElement,
  PackageElement,
  PartDefinitionElement,
} from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository/types';

import { stripStandardLibrary } from '@/library';

import { parseProjectJson, serializeProjectJson } from '../jsonProject';

function makeProject(): Project {
  const rootId = createElementId();
  const blockId = createElementId();
  const root: PackageElement = {
    kind: 'Package',
    id: rootId,
    name: 'Demo',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  };
  const block: PartDefinitionElement = {
    kind: 'PartDefinition',
    id: blockId,
    name: 'Block 1',
    isAbstract: false,
    ownerId: rootId,
    ownerRole: 'member',
    ownerIndex: 0,
  };
  const elements: readonly ModelElement[] = [root, block];
  const diagram: Diagram = {
    id: createDiagramId(),
    viewpointId: bddViewpoint.id,
    name: 'Main BDD',
    positions: { [blockId]: { x: 120, y: 240 } },
    context: { kind: 'package', id: rootId },
  };
  return {
    id: createProjectId(),
    name: 'Demo',
    createdAt: '2026-05-14T00:00:00.000Z',
    modifiedAt: '2026-05-14T00:00:00.000Z',
    rootId,
    elements,
    edges: [],
    diagrams: [diagram],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

describe('jsonProject', () => {
  it('round-trips a project losslessly (user content only; library is merged on parse)', () => {
    const project = makeProject();
    const text = serializeProjectJson(project);
    const parsed = parseProjectJson(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // parseProjectJson re-merges the standard library so the in-memory
    // project mirrors a `load()`-ed shape. Strip it before comparison —
    // the user-content portion of the round-trip is what must be lossless.
    expect(stripStandardLibrary(parsed.project)).toEqual(project);
  });

  it('serializes as pretty-printed JSON ending with a newline', () => {
    const text = serializeProjectJson(makeProject());
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  ');
  });

  it('rejects invalid JSON', () => {
    const result = parseProjectJson('{not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/invalid JSON/);
  });

  it('rejects a top-level JSON array', () => {
    const result = parseProjectJson('[]');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/object/);
  });

  it('rejects a project missing required fields', () => {
    const result = parseProjectJson(JSON.stringify({ id: 'p', name: 'X' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a project with no diagrams', () => {
    const project = makeProject();
    const broken = { ...project, diagrams: [] };
    const result = parseProjectJson(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/diagrams/);
  });

  it('defaults missing history and conversations on partial input', () => {
    const project = makeProject();
    const partial = {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      modifiedAt: project.modifiedAt,
      elements: project.elements,
      edges: project.edges,
      diagrams: project.diagrams,
    };
    const result = parseProjectJson(JSON.stringify(partial));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.history).toEqual(EMPTY_COMMAND_HISTORY);
    expect(result.project.conversations).toEqual([]);
  });

  it('round-trips a non-default routingStyle on a ModelEdge (refs #564)', () => {
    const project = makeProject();
    const elements = project.elements as ModelElement[];
    const blockA = elements.find((e) => e.kind === 'PartDefinition')!;
    const blockB: PartDefinitionElement = {
      kind: 'PartDefinition',
      id: createElementId(),
      name: 'Block 2',
      isAbstract: false,
      ownerId: blockA.ownerId,
      ownerRole: 'member',
      ownerIndex: 1,
    };
    const edge: CompositionEdge = {
      kind: 'Composition',
      id: createEdgeId(),
      sourceId: blockA.id,
      targetId: blockB.id,
      routingStyle: 'straight',
    };
    const projectWithEdge: Project = {
      ...project,
      elements: [...project.elements, blockB],
      edges: [edge] as readonly ModelEdge[],
    };
    const text = serializeProjectJson(projectWithEdge);
    const parsed = parseProjectJson(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const roundTrippedEdge = stripStandardLibrary(parsed.project).edges.find(
      (e) => e.id === edge.id,
    );
    expect(roundTrippedEdge).toBeDefined();
    expect(roundTrippedEdge?.routingStyle).toBe('straight');
  });

  it('round-trips non-default strokeStyle and strokeColor on a ModelEdge (refs #566)', () => {
    const project = makeProject();
    const elements = project.elements as ModelElement[];
    const blockA = elements.find((e) => e.kind === 'PartDefinition')!;
    const blockB: PartDefinitionElement = {
      kind: 'PartDefinition',
      id: createElementId(),
      name: 'Block 3',
      isAbstract: false,
      ownerId: blockA.ownerId,
      ownerRole: 'member',
      ownerIndex: 1,
    };
    const edge: CompositionEdge = {
      kind: 'Composition',
      id: createEdgeId(),
      sourceId: blockA.id,
      targetId: blockB.id,
      strokeStyle: 'dashed',
      strokeColor: '#ff0000',
    };
    const projectWithEdge: Project = {
      ...project,
      elements: [...project.elements, blockB],
      edges: [edge] as readonly ModelEdge[],
    };
    const text = serializeProjectJson(projectWithEdge);
    const parsed = parseProjectJson(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const roundTrippedEdge = stripStandardLibrary(parsed.project).edges.find(
      (e) => e.id === edge.id,
    );
    expect(roundTrippedEdge).toBeDefined();
    expect(roundTrippedEdge?.strokeStyle).toBe('dashed');
    expect(roundTrippedEdge?.strokeColor).toBe('#ff0000');
  });
});
