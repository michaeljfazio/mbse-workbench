import { z } from 'zod';
import type { Command } from '@/commands/types';
import type { ElementId, RequirementTraceEdge, RequirementTraceKind } from '@/model';
import { createEdgeId } from '@/model';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { LLMToolDefinition, ProposedChange, ToolOutput } from '../types';

const TRACE_KINDS = ['satisfy', 'verify', 'derive', 'refine'] as const;

export const linkRequirementSchema = z
  .object({
    requirementId: z.string().min(1),
    targetId: z.string().min(1),
    traceKind: z.enum(TRACE_KINDS),
  })
  .strict();

export type LinkRequirementInput = z.infer<typeof linkRequirementSchema>;

export const linkRequirementDefinition: LLMToolDefinition = {
  name: 'link_requirement',
  description:
    'Propose linking a Requirement to another model element via a traceability edge. The user must accept the proposal before the link is applied. "requirementId" must refer to a Requirement element. "targetId" must refer to any existing element. "traceKind" is one of: satisfy, verify, derive, refine. The edge is oriented from the requirement (source) to the target.',
  input_schema: {
    type: 'object',
    properties: {
      requirementId: {
        type: 'string',
        description: 'ElementId of an existing Requirement.',
      },
      targetId: {
        type: 'string',
        description: 'ElementId of any existing element to link the requirement to.',
      },
      traceKind: {
        type: 'string',
        enum: [...TRACE_KINDS],
        description: 'Kind of traceability relationship.',
      },
    },
    additionalProperties: false,
    required: ['requirementId', 'targetId', 'traceKind'],
  },
};

export async function linkRequirementHandler(
  input: LinkRequirementInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const elements = reader.elements();

  const requirementId = input.requirementId as ElementId;
  const requirement = elements.find((e) => e.id === requirementId);
  if (requirement === undefined) {
    throw new Error(`requirementId "${input.requirementId}" does not refer to an existing element.`);
  }
  if (requirement.kind !== 'Requirement') {
    throw new Error(
      `requirementId "${input.requirementId}" refers to a ${requirement.kind}, not a Requirement.`,
    );
  }

  const targetId = input.targetId as ElementId;
  const target = elements.find((e) => e.id === targetId);
  if (target === undefined) {
    throw new Error(`targetId "${input.targetId}" does not refer to an existing element.`);
  }

  if (requirementId === targetId) {
    throw new Error('A requirement cannot be linked to itself.');
  }

  const traceKind = input.traceKind as RequirementTraceKind;
  const existing = reader
    .edges()
    .find(
      (e) =>
        e.kind === 'RequirementTrace' &&
        e.sourceId === requirementId &&
        e.targetId === targetId &&
        e.traceKind === traceKind,
    );
  if (existing !== undefined) {
    throw new Error(
      `A "${traceKind}" trace from requirement "${requirement.name}" to "${target.name}" already exists.`,
    );
  }

  const edge: RequirementTraceEdge = {
    id: createEdgeId(),
    kind: 'RequirementTrace',
    sourceId: requirementId,
    targetId,
    traceKind,
  };

  const commands: Command[] = [{ kind: 'link', edge }];

  const change: ProposedChange = {
    id: edge.id,
    summary: `Link requirement "${requirement.name}" --${traceKind}--> "${target.name}" (${target.kind})`,
    commands,
  };

  return { kind: 'proposed-change', change };
}
