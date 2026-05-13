import { z } from 'zod';
import type { Command } from '@/commands/types';
import type {
  CompositionEdge,
  ElementId,
  PartDefinitionElement,
} from '@/model';
import { createEdgeId, createElementId } from '@/model';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';
import type { LLMToolDefinition, ProposedChange, ToolOutput } from '../types';

export const proposeDecompositionSchema = z
  .object({
    parentPartDefinitionId: z.string().min(1),
    childNames: z.array(z.string().min(1).max(120)).min(1).max(20),
  })
  .strict();

export type ProposeDecompositionInput = z.infer<typeof proposeDecompositionSchema>;

export const proposeDecompositionDefinition: LLMToolDefinition = {
  name: 'propose_decomposition',
  description:
    'Propose decomposing an existing PartDefinition into child PartDefinitions. For each name in "childNames", a new PartDefinition is created and a Composition edge is added from the parent (source) to the child (target). The user must accept the proposal before any change is applied. "parentPartDefinitionId" must refer to an existing PartDefinition. Duplicate child names (case-insensitive) are rejected. Child names that collide with an existing direct composition child (case-insensitive) are also rejected.',
  input_schema: {
    type: 'object',
    properties: {
      parentPartDefinitionId: {
        type: 'string',
        description: 'ElementId of an existing PartDefinition to decompose.',
      },
      childNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Names of the new child PartDefinitions to create under the parent.',
      },
    },
    additionalProperties: false,
    required: ['parentPartDefinitionId', 'childNames'],
  },
};

export async function proposeDecompositionHandler(
  input: ProposeDecompositionInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const elements = reader.elements();
  const edges = reader.edges();

  const parentId = input.parentPartDefinitionId as ElementId;
  const parent = elements.find((e) => e.id === parentId);
  if (parent === undefined) {
    throw new Error(
      `parentPartDefinitionId "${input.parentPartDefinitionId}" does not refer to an existing element.`,
    );
  }
  if (parent.kind !== 'PartDefinition') {
    throw new Error(
      `parentPartDefinitionId "${input.parentPartDefinitionId}" refers to a ${parent.kind}, not a PartDefinition.`,
    );
  }

  const seen = new Set<string>();
  for (const name of input.childNames) {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Duplicate child name "${name}" in childNames.`);
    }
    seen.add(key);
  }

  const existingChildNames = new Set(
    edges
      .filter((e): e is CompositionEdge => e.kind === 'Composition' && e.sourceId === parentId)
      .map((e) => elements.find((el) => el.id === e.targetId))
      .filter((el): el is PartDefinitionElement => el?.kind === 'PartDefinition')
      .map((el) => el.name.trim().toLowerCase()),
  );
  for (const name of input.childNames) {
    if (existingChildNames.has(name.trim().toLowerCase())) {
      throw new Error(
        `A child named "${name}" is already composed under "${parent.name}".`,
      );
    }
  }

  const commands: Command[] = [];
  const newChildIds: ElementId[] = [];
  for (const name of input.childNames) {
    const id = createElementId();
    newChildIds.push(id);
    const child: PartDefinitionElement = {
      id,
      kind: 'PartDefinition',
      name: name.trim(),
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    commands.push({ kind: 'create-element', element: child });
    const edge: CompositionEdge = {
      id: createEdgeId(),
      kind: 'Composition',
      sourceId: parentId,
      targetId: id,
    };
    commands.push({ kind: 'link', edge });
  }

  const first = newChildIds[0];
  if (first === undefined) {
    throw new Error('Internal error: no child PartDefinitions generated.');
  }

  const count = newChildIds.length;
  const summary = `Decompose "${parent.name}" into ${count} child PartDefinition${count === 1 ? '' : 's'}`;

  const change: ProposedChange = {
    id: first,
    summary,
    commands,
  };

  return { kind: 'proposed-change', change };
}
