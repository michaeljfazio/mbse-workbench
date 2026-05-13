import { describe, expect, it } from 'vitest';
import { critiqueModelHandler, critiqueModelSchema } from '@/llm/tools/critique-model';
import { createProjectReader } from '@/llm/project-reader';
import type { ModelElement } from '@/model';
import type { ModelEdge } from '@/model';

const mkEl = (kind: string, name: string, id: string, extra?: Record<string, unknown>): ModelElement =>
  ({ kind, name, id, isAbstract: false, propertyIds: [], portIds: [], ...extra }) as unknown as ModelElement;

const mkEdge = (kind: string, id: string, sourceId: string, targetId: string): ModelEdge =>
  ({ kind, id, sourceId, targetId }) as unknown as ModelEdge;

describe('critique_model tool', () => {
  it('flags unsatisfied requirements (requirements with no satisfy edge)', async () => {
    const elements: ModelElement[] = [
      mkEl('PartDefinition', 'Engine', 'el-1'),
      mkEl('Requirement', 'REQ-001', 'req-1'),
    ];
    const reader = createProjectReader({
      projectName: 'Test Project',
      elements,
      edges: [],
      diagrams: [],
      activeDiagramId: null,
    });

    const input = critiqueModelSchema.parse({});
    const output = await critiqueModelHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as {
        findings: Array<{ category: string; message: string; elementIds?: string[] }>;
      };
      const unsatisfied = data.findings.filter((f) => f.category === 'unsatisfied-requirement');
      expect(unsatisfied.length).toBeGreaterThan(0);
      expect(unsatisfied.some((f) => f.elementIds?.includes('req-1'))).toBe(true);
    }
  });

  it('flags orphan ports (PortDefinition with no parent PartDefinition)', async () => {
    const elements: ModelElement[] = [
      mkEl('PortDefinition', 'OrphanPort', 'port-1'),
    ];
    const reader = createProjectReader({
      projectName: 'Test Project',
      elements,
      edges: [],
      diagrams: [],
      activeDiagramId: null,
    });

    const input = critiqueModelSchema.parse({});
    const output = await critiqueModelHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { findings: Array<{ category: string; elementIds?: string[] }> };
      const orphanFindings = data.findings.filter((f) => f.category === 'orphan-port');
      expect(orphanFindings.some((f) => f.elementIds?.includes('port-1'))).toBe(true);
    }
  });

  it('returns summary for a model with a RequirementTrace edge satisfying requirements', async () => {
    const elements: ModelElement[] = [
      mkEl('PartDefinition', 'Engine', 'el-1', { portIds: ['port-1'] }),
      mkEl('PortDefinition', 'InletPort', 'port-1'),
      mkEl('Requirement', 'REQ-001', 'req-1'),
    ];
    const edges: ModelEdge[] = [
      mkEdge('RequirementTrace', 'edge-1', 'el-1', 'req-1'),
    ];
    const reader = createProjectReader({
      projectName: 'Test Project',
      elements,
      edges,
      diagrams: [],
      activeDiagramId: null,
    });

    const input = critiqueModelSchema.parse({});
    const output = await critiqueModelHandler(input, { conversationId: 'c1' }, reader);

    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { summary: string; findings: unknown[] };
      expect(typeof data.summary).toBe('string');
      // REQ-001 is satisfied, InletPort owned by Engine — no orphan or unsatisfied
      expect(data.findings).toHaveLength(0);
    }
  });
});
