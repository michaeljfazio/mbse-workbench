import { z } from 'zod';
import type { Command } from '@/commands/types';
import type { ElementId, RequirementElement } from '@/model';
import { createElementId } from '@/model';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { LLMToolDefinition, ProposedChange, ToolOutput } from '../types';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['draft', 'approved', 'implemented', 'verified', 'rejected'] as const;

export const generateRequirementsFromTextSchema = z
  .object({
    text: z.string().min(1).max(20000),
    owningPackageId: z.string().optional(),
    defaultPriority: z.enum(PRIORITIES).optional(),
    defaultStatus: z.enum(STATUSES).optional(),
  })
  .strict();

export type GenerateRequirementsFromTextInput = z.infer<
  typeof generateRequirementsFromTextSchema
>;

export const generateRequirementsFromTextDefinition: LLMToolDefinition = {
  name: 'generate_requirements_from_text',
  description:
    'Propose creating one or more Requirement elements parsed from free-form text. Each non-empty line (after stripping leading bullet/number markers like "-", "*", "1.", "1)") becomes one Requirement. The line text becomes the requirement\'s "text" field; the first short fragment becomes its "name". The user must accept the proposal before any change is applied. If "owningPackageId" refers to an existing Package, every new requirement is added to that package\'s members.',
  input_schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description:
          'Free-form text. Each non-empty line is converted into one Requirement.',
      },
      owningPackageId: {
        type: 'string',
        description:
          'Optional ElementId of an existing Package. All generated requirements are added to its memberIds.',
      },
      defaultPriority: {
        type: 'string',
        enum: [...PRIORITIES],
        description: 'Priority applied to every generated requirement. Defaults to "medium".',
      },
      defaultStatus: {
        type: 'string',
        enum: [...STATUSES],
        description: 'Status applied to every generated requirement. Defaults to "draft".',
      },
    },
    additionalProperties: false,
    required: ['text'],
  },
};

const BULLET_PREFIX = /^\s*(?:[-*•]|(?:\d+[.)]))\s+/;

export function parseRequirementLines(text: string): { name: string; text: string }[] {
  const result: { name: string; text: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const stripped = raw.replace(BULLET_PREFIX, '').trim();
    if (stripped.length < 3) continue;
    const name = deriveName(stripped);
    result.push({ name, text: stripped });
  }
  return result;
}

function deriveName(line: string): string {
  const firstSentence = line.split(/(?<=[.!?])\s/)[0] ?? line;
  const candidate = firstSentence.trim();
  if (candidate.length <= 60) return candidate.replace(/[.!?]+$/, '');
  return candidate.slice(0, 57).replace(/\s+\S*$/, '').concat('…');
}

export async function generateRequirementsFromTextHandler(
  input: GenerateRequirementsFromTextInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const parsed = parseRequirementLines(input.text);
  if (parsed.length === 0) {
    throw new Error('No requirement lines could be parsed from the supplied text.');
  }

  let owningPackageId: ElementId | undefined;
  if (input.owningPackageId !== undefined) {
    const ownerCandidateId = input.owningPackageId as ElementId;
    const owner = reader.elements().find((e) => e.id === ownerCandidateId);
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

  const priority = input.defaultPriority ?? 'medium';
  const status = input.defaultStatus ?? 'draft';

  const commands: Command[] = [];
  const newIds: ElementId[] = [];
  for (const line of parsed) {
    const id = createElementId();
    newIds.push(id);
    const element: RequirementElement = {
      id,
      kind: 'Requirement',
      name: line.name,
      text: line.text,
      priority,
      status,
    };
    commands.push({ kind: 'create-element', element });
  }

  if (owningPackageId !== undefined) {
    const owner = reader.elements().find((e) => e.id === owningPackageId);
    if (owner !== undefined && owner.kind === 'Package') {
      commands.push({
        kind: 'update-element',
        id: owningPackageId,
        patch: { memberIds: [...owner.memberIds, ...newIds] },
      });
    }
  }

  const first = newIds[0];
  if (first === undefined) {
    throw new Error('Internal error: no requirements generated.');
  }

  const summary =
    owningPackageId !== undefined
      ? `Generate ${parsed.length} requirement${parsed.length === 1 ? '' : 's'} in package ${owningPackageId}`
      : `Generate ${parsed.length} requirement${parsed.length === 1 ? '' : 's'}`;

  const change: ProposedChange = {
    id: first,
    summary,
    commands,
  };

  return { kind: 'proposed-change', change };
}
