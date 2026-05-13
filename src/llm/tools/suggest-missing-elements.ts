import { z } from 'zod';
import type { Command, UpdateElementCommand } from '@/commands/types';
import type {
  ElementId,
  PartDefinitionElement,
  RequirementElement,
  RequirementTraceEdge,
} from '@/model';
import { createEdgeId, createElementId } from '@/model';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { LLMToolDefinition, ProposedChange, ToolOutput } from '../types';

export const suggestMissingElementsSchema = z
  .object({
    owningPackageId: z.string().optional(),
    maxSuggestions: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export type SuggestMissingElementsInput = z.infer<typeof suggestMissingElementsSchema>;

export const suggestMissingElementsDefinition: LLMToolDefinition = {
  name: 'suggest_missing_elements',
  description:
    'Scan the current model for PartDefinitions that have no incoming RequirementTrace edge of any kind, and propose creating a placeholder Requirement (with a "satisfy" trace) for each. The user must accept the proposal before any change is applied. At most "maxSuggestions" PartDefinitions are addressed in a single call (default 5, max 20). If "owningPackageId" refers to an existing Package, every new Requirement is added to its members. Throws if the model has no un-required PartDefinitions.',
  input_schema: {
    type: 'object',
    properties: {
      owningPackageId: {
        type: 'string',
        description:
          'Optional ElementId of an existing Package. All generated requirements are added to its memberIds.',
      },
      maxSuggestions: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        description: 'Cap on the number of PartDefinitions addressed in one call. Defaults to 5.',
      },
    },
    additionalProperties: false,
    required: [],
  },
};

export async function suggestMissingElementsHandler(
  input: SuggestMissingElementsInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const elements = reader.elements();
  const edges = reader.edges();

  let owningPackageId: ElementId | undefined;
  if (input.owningPackageId !== undefined) {
    const ownerCandidateId = input.owningPackageId as ElementId;
    const owner = elements.find((e) => e.id === ownerCandidateId);
    if (owner === undefined) {
      throw new Error(
        `owningPackageId "${input.owningPackageId}" does not refer to an existing element.`,
      );
    }
    if (owner.kind !== 'Package') {
      throw new Error(
        `owningPackageId "${input.owningPackageId}" refers to a ${owner.kind}, not a Package.`,
      );
    }
    owningPackageId = ownerCandidateId;
  }

  const tracedTargetIds = new Set<ElementId>(
    edges
      .filter((e) => e.kind === 'RequirementTrace')
      .map((e) => e.targetId),
  );

  const candidates: PartDefinitionElement[] = elements
    .filter((e): e is PartDefinitionElement => e.kind === 'PartDefinition')
    .filter((p) => !tracedTargetIds.has(p.id));

  if (candidates.length === 0) {
    throw new Error('No un-required PartDefinitions were found; nothing to suggest.');
  }

  const cap = input.maxSuggestions ?? 5;
  const selected = candidates.slice(0, cap);

  const commands: Command[] = [];
  const newRequirementIds: ElementId[] = [];
  for (const part of selected) {
    const reqId = createElementId();
    newRequirementIds.push(reqId);
    const requirement: RequirementElement = {
      id: reqId,
      kind: 'Requirement',
      name: `${part.name} requirement`,
      text: `${part.name} shall fulfil its intended purpose.`,
      priority: 'medium',
      status: 'draft',
    };
    commands.push({ kind: 'create-element', element: requirement });
    const edge: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqId,
      targetId: part.id,
      traceKind: 'satisfy',
    };
    commands.push({ kind: 'link', edge });
  }

  if (owningPackageId !== undefined) {
    const owner = elements.find((e) => e.id === owningPackageId);
    if (owner !== undefined && owner.kind === 'Package') {
      const updatePackage: UpdateElementCommand<'Package'> = {
        kind: 'update-element',
        id: owningPackageId,
        patch: { memberIds: [...owner.memberIds, ...newRequirementIds] },
      };
      commands.push(updatePackage);
    }
  }

  const first = newRequirementIds[0];
  if (first === undefined) {
    throw new Error('Internal error: no suggestions generated.');
  }

  const n = selected.length;
  const base = `Suggest ${n} placeholder Requirement${n === 1 ? '' : 's'} for un-required PartDefinition${n === 1 ? '' : 's'}`;
  const summary =
    owningPackageId !== undefined ? `${base} in package ${owningPackageId}` : base;

  const change: ProposedChange = {
    id: first,
    summary,
    commands,
  };

  return { kind: 'proposed-change', change };
}
