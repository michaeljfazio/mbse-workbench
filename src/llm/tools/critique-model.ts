import { z } from 'zod';
import type { LLMToolDefinition, ToolOutput } from '../types';
import type { ToolContext } from '../registry';
import type { ProjectReader } from '../project-reader';

export const critiqueModelSchema = z.object({}).strict();

export type CritiqueModelInput = z.infer<typeof critiqueModelSchema>;

export const critiqueModelDefinition: LLMToolDefinition = {
  name: 'critique_model',
  description:
    'Runs heuristic checks on the active project model and returns a list of findings: unsatisfied requirements, orphan ports, parts with no definitions, and other common modelling gaps.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

interface Finding {
  readonly category: string;
  readonly message: string;
  readonly elementIds?: readonly string[];
}

export async function critiqueModelHandler(
  _input: CritiqueModelInput,
  _ctx: ToolContext,
  reader: ProjectReader,
): Promise<ToolOutput> {
  const elements = reader.elements();
  const edges = reader.edges();
  const findings: Finding[] = [];

  // Unsatisfied requirements: Requirement elements with no RequirementTrace edge ending at them
  const requirementIds = new Set(elements.filter((e) => e.kind === 'Requirement').map((e) => e.id));
  const satisfiedReqIds = new Set(
    edges
      .filter((e) => e.kind === 'RequirementTrace')
      .map((e) => e.targetId),
  );
  for (const reqId of requirementIds) {
    if (!satisfiedReqIds.has(reqId)) {
      const req = elements.find((e) => e.id === reqId);
      findings.push({
        category: 'unsatisfied-requirement',
        message: `Requirement "${req?.name ?? reqId}" has no satisfy/verify trace.`,
        elementIds: [reqId],
      });
    }
  }

  // Orphan ports: PortDefinition with no PartDefinition that references it via portIds
  const portsOwnedByPart = new Set(
    elements
      .filter((e) => e.kind === 'PartDefinition')
      .flatMap((e) => (e.kind === 'PartDefinition' ? (e.portIds as readonly string[]) : [])),
  );
  const orphanPorts = elements.filter(
    (e) => e.kind === 'PortDefinition' && !portsOwnedByPart.has(e.id),
  );
  for (const port of orphanPorts) {
    findings.push({
      category: 'orphan-port',
      message: `PortDefinition "${port.name}" is not referenced by any PartDefinition.portIds.`,
      elementIds: [port.id],
    });
  }

  // PartUsage with no definitionId pointing to an existing PartDefinition
  const partDefinitionIds = new Set(
    elements.filter((e) => e.kind === 'PartDefinition').map((e) => e.id),
  );
  const danglingPartUsages = elements.filter(
    (e) =>
      e.kind === 'PartUsage' &&
      !partDefinitionIds.has((e as unknown as { definitionId: string }).definitionId),
  );
  for (const usage of danglingPartUsages) {
    findings.push({
      category: 'dangling-part-usage',
      message: `PartUsage "${usage.name}" has no matching PartDefinition.`,
      elementIds: [usage.id],
    });
  }

  const summary =
    findings.length === 0
      ? 'No issues found. The model looks well-formed.'
      : `Found ${findings.length} issue(s).`;

  return {
    kind: 'data',
    data: { summary, findings },
  };
}
