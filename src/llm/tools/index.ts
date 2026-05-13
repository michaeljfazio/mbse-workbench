import type { ToolRegistry } from '../registry';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { ToolOutput } from '../types';

import { queryModelDefinition, queryModelSchema, queryModelHandler } from './query-model';
import { explainDiagramDefinition, explainDiagramSchema, explainDiagramHandler } from './explain-diagram';
import { critiqueModelDefinition, critiqueModelSchema, critiqueModelHandler } from './critique-model';
import { createElementDefinition, createElementSchema, createElementHandler } from './create-element';
import {
  linkRequirementDefinition,
  linkRequirementSchema,
  linkRequirementHandler,
} from './link-requirement';
import {
  generateRequirementsFromTextDefinition,
  generateRequirementsFromTextSchema,
  generateRequirementsFromTextHandler,
} from './generate-requirements-from-text';
import {
  proposeDecompositionDefinition,
  proposeDecompositionSchema,
  proposeDecompositionHandler,
} from './propose-decomposition';

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
    [
      'create_element',
      {
        definition: createElementDefinition,
        inputSchema: createElementSchema,
        mutating: true,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          createElementHandler(createElementSchema.parse(input), ctx, getReader()),
      },
    ],
    [
      'link_requirement',
      {
        definition: linkRequirementDefinition,
        inputSchema: linkRequirementSchema,
        mutating: true,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          linkRequirementHandler(linkRequirementSchema.parse(input), ctx, getReader()),
      },
    ],
    [
      'generate_requirements_from_text',
      {
        definition: generateRequirementsFromTextDefinition,
        inputSchema: generateRequirementsFromTextSchema,
        mutating: true,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          generateRequirementsFromTextHandler(
            generateRequirementsFromTextSchema.parse(input),
            ctx,
            getReader(),
          ),
      },
    ],
    [
      'propose_decomposition',
      {
        definition: proposeDecompositionDefinition,
        inputSchema: proposeDecompositionSchema,
        mutating: true,
        handler: async (input: unknown, ctx: ToolContext): Promise<ToolOutput> =>
          proposeDecompositionHandler(
            proposeDecompositionSchema.parse(input),
            ctx,
            getReader(),
          ),
      },
    ],
  ]);
  return registry;
}
