import { z } from 'zod';
import type { Command, UpdateElementCommand } from '@/commands/types';
import type {
  ActorElement,
  ElementId,
  ModelElement,
  PackageElement,
  PartDefinitionElement,
  RequirementElement,
  UseCaseElement,
} from '@/model';
import { createElementId } from '@/model';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { LLMToolDefinition, ProposedChange, ToolOutput } from '../types';

const CREATABLE_KINDS = ['Package', 'PartDefinition', 'Requirement', 'UseCase', 'Actor'] as const;
type CreatableKind = (typeof CREATABLE_KINDS)[number];

const requirementPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const requirementStatusSchema = z.enum([
  'draft',
  'approved',
  'implemented',
  'verified',
  'rejected',
]);

export const createElementSchema = z
  .object({
    kind: z.enum(CREATABLE_KINDS),
    name: z.string().min(1).max(120),
    documentation: z.string().max(2000).optional(),
    owningPackageId: z.string().optional(),
    requirement: z
      .object({
        text: z.string().min(1).max(2000),
        reqId: z.string().max(80).optional(),
        priority: requirementPrioritySchema.optional(),
        status: requirementStatusSchema.optional(),
        rationale: z.string().max(2000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CreateElementInput = z.infer<typeof createElementSchema>;

export const createElementDefinition: LLMToolDefinition = {
  name: 'create_element',
  description:
    'Propose creating a new model element. The user must accept the proposal before any change is applied. Supported kinds: Package, PartDefinition, Requirement, UseCase, Actor. For kind="Requirement" you MUST also pass a "requirement" object with at least { text }. If "owningPackageId" is provided and refers to an existing Package, the new element is also added as a member of that package.',
  input_schema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: [...CREATABLE_KINDS],
        description: 'Element kind to create.',
      },
      name: { type: 'string', description: 'Display name for the new element.' },
      documentation: {
        type: 'string',
        description: 'Optional free-text documentation for the element.',
      },
      owningPackageId: {
        type: 'string',
        description:
          'Optional ElementId of an existing Package. When supplied, the new element is added to that package\'s memberIds.',
      },
      requirement: {
        type: 'object',
        description: 'Required when kind="Requirement". Carries Requirement-specific fields.',
        properties: {
          text: { type: 'string' },
          reqId: { type: 'string', description: 'Human-readable identifier such as "REQ-001".' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          status: {
            type: 'string',
            enum: ['draft', 'approved', 'implemented', 'verified', 'rejected'],
          },
          rationale: { type: 'string' },
        },
        additionalProperties: false,
        required: ['text'],
      },
    },
    additionalProperties: false,
    required: ['kind', 'name'],
  },
};

function buildElement(input: CreateElementInput, id: ElementId): ModelElement {
  const kind = input.kind as CreatableKind;
  const documentation = input.documentation;
  switch (kind) {
    case 'Package': {
      const el: PackageElement = {
        id,
        kind: 'Package',
        name: input.name,
        memberIds: [],
        ...(documentation !== undefined ? { documentation } : {}),
      };
      return el;
    }
    case 'PartDefinition': {
      const el: PartDefinitionElement = {
        id,
        kind: 'PartDefinition',
        name: input.name,
        isAbstract: false,
        propertyIds: [],
        portIds: [],
        ...(documentation !== undefined ? { documentation } : {}),
      };
      return el;
    }
    case 'Requirement': {
      const req = input.requirement;
      if (req === undefined) {
        throw new Error('kind="Requirement" requires a "requirement" object with at least { text }.');
      }
      const el: RequirementElement = {
        id,
        kind: 'Requirement',
        name: input.name,
        text: req.text,
        priority: req.priority ?? 'medium',
        status: req.status ?? 'draft',
        ...(req.reqId !== undefined ? { reqId: req.reqId } : {}),
        ...(req.rationale !== undefined ? { rationale: req.rationale } : {}),
        ...(documentation !== undefined ? { documentation } : {}),
      };
      return el;
    }
    case 'UseCase': {
      const el: UseCaseElement = {
        id,
        kind: 'UseCase',
        name: input.name,
        ...(documentation !== undefined ? { documentation } : {}),
      };
      return el;
    }
    case 'Actor': {
      const el: ActorElement = {
        id,
        kind: 'Actor',
        name: input.name,
        ...(documentation !== undefined ? { documentation } : {}),
      };
      return el;
    }
  }
}

export async function createElementHandler(
  input: CreateElementInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const id = createElementId();
  const element = buildElement(input, id);

  const commands: Command[] = [{ kind: 'create-element', element }];

  if (input.owningPackageId !== undefined) {
    const packageId = input.owningPackageId as ElementId;
    const owner = reader.elements().find((e) => e.id === packageId);
    if (owner === undefined) {
      throw new Error(`owningPackageId "${input.owningPackageId}" does not refer to an existing element.`);
    }
    if (owner.kind !== 'Package') {
      throw new Error(
        `owningPackageId "${input.owningPackageId}" refers to a ${owner.kind}, not a Package.`,
      );
    }
    const nextMembers: ElementId[] = [...owner.memberIds, id];
    const updatePackage: UpdateElementCommand<'Package'> = {
      kind: 'update-element',
      id: packageId,
      patch: { memberIds: nextMembers },
    };
    commands.push(updatePackage);
  }

  const summary =
    input.owningPackageId !== undefined
      ? `Create ${input.kind} "${input.name}" inside package ${input.owningPackageId}`
      : `Create ${input.kind} "${input.name}"`;

  const change: ProposedChange = {
    id,
    summary,
    commands,
  };

  return { kind: 'proposed-change', change };
}
