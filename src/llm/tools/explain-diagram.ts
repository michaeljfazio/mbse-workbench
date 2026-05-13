import { z } from 'zod';
import type { LLMToolDefinition, ToolOutput } from '../types';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';

export const explainDiagramSchema = z.object({}).strict();

export type ExplainDiagramInput = z.infer<typeof explainDiagramSchema>;

export const explainDiagramDefinition: LLMToolDefinition = {
  name: 'explain_diagram',
  description:
    'Returns a structured description of the currently active diagram: its name, viewpoint type, and the elements visible on it with their kinds and names. Use this to understand what the user is looking at.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function explainDiagramHandler(
  _input: ExplainDiagramInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const diagram = reader.activeDiagram();

  if (diagram === null) {
    return {
      kind: 'data',
      data: {
        error: 'No active diagram is currently open.',
      },
    };
  }

  const allElements = reader.elements();
  const elementIdsInDiagram = new Set(Object.keys(diagram.positions));
  const diagramElements = allElements.filter((el) => elementIdsInDiagram.has(el.id));

  return {
    kind: 'data',
    data: {
      diagramName: diagram.name,
      viewpointId: diagram.viewpointId,
      elementCount: diagramElements.length,
      elements: diagramElements.map((el) => ({
        id: el.id,
        kind: el.kind,
        name: el.name,
      })),
    },
  };
}
