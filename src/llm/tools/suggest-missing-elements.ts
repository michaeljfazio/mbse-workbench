import { z } from 'zod';
import type { Command } from '@/commands/types';
import type {
  ElementId,
  ModelElement,
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
          'Optional ElementId of an existing Package. All generated requirements are owned by it. Defaults to the project root package.',
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

function countMembers(elements: readonly ModelElement[], ownerId: ElementId): number {
  return elements.filter((e) => e.ownerId === ownerId && e.ownerRole === 'member').length;
}

export async function suggestMissingElementsHandler(
  input: SuggestMissingElementsInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const elements = reader.elements();
  const edges = reader.edges();

  let ownerId: ElementId;
  let explicitOwner = false;
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
    ownerId = ownerCandidateId;
    explicitOwner = true;
  } else {
    ownerId = reader.rootId;
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

  const baseIndex = countMembers(elements, ownerId);
  const commands: Command[] = [];
  const newRequirementIds: ElementId[] = [];
  for (let i = 0; i < selected.length; i++) {
    const part = selected[i]!;
    const reqId = createElementId();
    newRequirementIds.push(reqId);
    const requirement: RequirementElement = {
      id: reqId,
      ownerId,
      ownerRole: 'member',
      ownerIndex: baseIndex + i,
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

  const first = newRequirementIds[0];
  if (first === undefined) {
    throw new Error('Internal error: no suggestions generated.');
  }

  const n = selected.length;
  const base = `Suggest ${n} placeholder Requirement${n === 1 ? '' : 's'} for un-required PartDefinition${n === 1 ? '' : 's'}`;
  const summary = explicitOwner ? `${base} in package ${ownerId}` : base;

  const change: ProposedChange = {
    id: first,
    summary,
    commands,
  };

  return { kind: 'proposed-change', change };
}
