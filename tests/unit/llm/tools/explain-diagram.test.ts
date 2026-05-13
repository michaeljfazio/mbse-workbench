import { describe, expect, it } from 'vitest';
import { explainDiagramHandler, explainDiagramSchema } from '@/llm/tools/explain-diagram';
import { createProjectReader } from '@/llm/project-reader';
import type { ModelElement } from '@/model';
import type { Diagram } from '@/workspace/diagram';

const mkEl = (kind: string, name: string, id: string): ModelElement =>
  ({ kind, name, id, isAbstract: false, propertyIds: [], portIds: [] }) as unknown as ModelElement;

const mkDiagram = (id: string, viewpointId: string, name: string): Diagram => ({
  id: id as Diagram['id'],
  viewpointId: viewpointId as Diagram['viewpointId'],
  name,
  positions: {},
});

const elements: ModelElement[] = [
  mkEl('PartDefinition', 'Engine', 'el-1'),
  mkEl('PartDefinition', 'Pump', 'el-2'),
];

const diagrams: Diagram[] = [
  mkDiagram('diag-1', 'bdd', 'System BDD'),
  mkDiagram('diag-2', 'ibd', 'Engine IBD'),
];

describe('explain_diagram tool', () => {
  it('describes the active diagram with elements in it', async () => {
    const positionedDiagram: Diagram = {
      ...diagrams[0]!,
      positions: {
        'el-1': { x: 0, y: 0 },
        'el-2': { x: 100, y: 0 },
      } as unknown as Diagram['positions'],
    };

    const reader = createProjectReader({
      projectName: 'Test Project',
      elements,
      edges: [],
      diagrams: [positionedDiagram, diagrams[1]!],
      activeDiagramId: 'diag-1',
    });

    const input = explainDiagramSchema.parse({});
    const output = await explainDiagramHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as {
        diagramName: string;
        viewpointId: string;
        elementCount: number;
        elements: Array<{ name: string }>;
      };
      expect(data.diagramName).toBe('System BDD');
      expect(data.viewpointId).toBe('bdd');
      expect(data.elementCount).toBe(2);
      expect(data.elements.map((e) => e.name)).toContain('Engine');
      expect(data.elements.map((e) => e.name)).toContain('Pump');
    }
  });

  it('returns a no-active-diagram message when no diagram is open', async () => {
    const reader = createProjectReader({
      projectName: 'Test Project',
      elements,
      edges: [],
      diagrams: [],
      activeDiagramId: null,
    });

    const input = explainDiagramSchema.parse({});
    const output = await explainDiagramHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { error: string };
      expect(data.error).toMatch(/no active diagram/i);
    }
  });
});
