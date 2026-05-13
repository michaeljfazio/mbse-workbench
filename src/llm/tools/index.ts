import type { ToolRegistry } from '../registry';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { ToolOutput } from '../types';

import { queryModelDefinition, queryModelSchema, queryModelHandler } from './query-model';
import { explainDiagramDefinition, explainDiagramSchema, explainDiagramHandler } from './explain-diagram';
import { critiqueModelDefinition, critiqueModelSchema, critiqueModelHandler } from './critique-model';

/**
 * Build the default ToolRegistry for the chat dispatcher.
 * The getReader callback is invoked at handler call time so the snapshot
 * is always current.
 */
export function buildToolRegistry(getReader: () => ProjectReader): ToolRegistry {
  const registry: ToolRegistry = new Map([
    [
      'query_model',
      {
        definition: queryModelDefinition,
        inputSchema: queryModelSchema,
        mutating: false,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          queryModelHandler(queryModelSchema.parse(input), ctx, getReader()),
      },
    ],
    [
      'explain_diagram',
      {
        definition: explainDiagramDefinition,
        inputSchema: explainDiagramSchema,
        mutating: false,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          explainDiagramHandler(explainDiagramSchema.parse(input), ctx, getReader()),
      },
    ],
    [
      'critique_model',
      {
        definition: critiqueModelDefinition,
        inputSchema: critiqueModelSchema,
        mutating: false,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          critiqueModelHandler(critiqueModelSchema.parse(input), ctx, getReader()),
      },
    ],
  ]);
  return registry;
}
