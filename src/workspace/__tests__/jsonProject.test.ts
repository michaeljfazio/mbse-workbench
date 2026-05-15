import { describe, expect, it } from 'vitest';

import { createDiagramId } from '@/workspace/diagram';
import type { Diagram } from '@/workspace/diagram';
import { bddViewpoint } from '@/viewpoints';
import { createElementId, createProjectId } from '@/model';
import type { ModelElement, PackageElement, PartDefinitionElement } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository/types';

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
  it('round-trips a project losslessly', () => {
    const project = makeProject();
    const text = serializeProjectJson(project);
    const parsed = parseProjectJson(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.project).toEqual(project);
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
});
