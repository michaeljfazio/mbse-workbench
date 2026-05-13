import { describe, expect, it } from 'vitest';
import { queryModelHandler, queryModelSchema } from '@/llm/tools/query-model';
import { createProjectReader } from '@/llm/project-reader';
import type { ModelElement } from '@/model';

const mkEl = (kind: string, name: string, id: string): ModelElement =>
  ({ kind, name, id, isAbstract: false, propertyIds: [], portIds: [] }) as unknown as ModelElement;

const reader = createProjectReader({
  projectName: 'Test Project',
  elements: [
    mkEl('PartDefinition', 'Engine', 'el-1'),
    mkEl('PartDefinition', 'Pump', 'el-2'),
    mkEl('PortDefinition', 'InletPort', 'el-3'),
    mkEl('Requirement', 'REQ-001', 'el-4'),
  ],
  edges: [],
  diagrams: [],
  activeDiagramId: null,
});

describe('query_model tool', () => {
  it('filter by kind returns matching elements', async () => {
    const input = queryModelSchema.parse({ filter: { kind: 'PartDefinition' } });
    const output = await queryModelHandler(input, { conversationId: 'c1' }, reader);
    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { elements: Array<{ id: string; kind: string }> };
      expect(data.elements).toHaveLength(2);
      expect(data.elements.every((e) => e.kind === 'PartDefinition')).toBe(true);
    }
  });

  it('filter by name pattern (case-insensitive substring) returns matching elements', async () => {
    const input = queryModelSchema.parse({ filter: { namePattern: 'port' } });
    const output = await queryModelHandler(input, { conversationId: 'c1' }, reader);
    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { elements: Array<{ name: string }> };
      expect(data.elements).toHaveLength(1);
      expect(data.elements[0]!.name).toBe('InletPort');
    }
  });

  it('no filter returns all elements (up to 100)', async () => {
    const input = queryModelSchema.parse({ filter: {} });
    const output = await queryModelHandler(input, { conversationId: 'c1' }, reader);
    expect(output.kind).toBe('data');
    if (output.kind === 'data') {
      const data = output.data as { elements: unknown[]; total: number };
      expect(data.total).toBe(4);
    }
  });

  it('zod rejects unknown filter keys', () => {
    expect(() => queryModelSchema.parse({ filter: { unknownKey: 'x' } })).toThrow();
  });
});
