import { z } from 'zod';
import type { LLMToolDefinition, ToolOutput } from '../types';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';

const filterSchema = z
  .object({
    kind: z.string().optional(),
    namePattern: z.string().optional(),
    owningPackageId: z.string().optional(),
  })
  .strict();

export const queryModelSchema = z
  .object({
    filter: filterSchema,
  })
  .strict();

export type QueryModelInput = z.infer<typeof queryModelSchema>;

export const queryModelDefinition: LLMToolDefinition = {
  name: 'query_model',
  description:
    'Read elements from the active project. Filter by element kind, name pattern (case-insensitive substring), or owning package ID. Returns up to 100 matching elements with their IDs, kinds, names, and key properties.',
  input_schema: {
    type: 'object',
    properties: {
      filter: {
        type: 'object',
        description: 'Filter criteria. Omit a key to skip that filter.',
        properties: {
          kind: { type: 'string', description: 'Exact element kind, e.g. "PartDefinition".' },
          namePattern: {
            type: 'string',
            description: 'Case-insensitive substring to match against element name.',
          },
          owningPackageId: {
            type: 'string',
            description: 'ElementId of a Package — return only elements whose owningPackageId matches.',
          },
        },
        additionalProperties: false,
      },
    },
    required: ['filter'],
  },
};

export async function queryModelHandler(
  input: QueryModelInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const { kind, namePattern, owningPackageId } = input.filter;
  const allElements = reader.elements();

  const matched = allElements.filter((el) => {
    if (kind !== undefined && el.kind !== kind) return false;
    if (namePattern !== undefined && !el.name.toLowerCase().includes(namePattern.toLowerCase()))
      return false;
    if (owningPackageId !== undefined) {
      if (el.ownerId !== owningPackageId) return false;
    }
    return true;
  });

  const limited = matched.slice(0, 100);

  return {
    kind: 'data',
    data: {
      total: matched.length,
      returned: limited.length,
      elements: limited.map((el) => ({
        id: el.id,
        kind: el.kind,
        name: el.name,
        documentation: 'documentation' in el ? el.documentation : undefined,
      })),
    },
  };
}
