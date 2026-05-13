import type { Project } from '@/repository/types';
import type {
  ElementId,
  ElementKind,
  ModelEdge,
  ModelElement,
  PackageElement,
  ValueLiteral,
} from '@/model';
import { ELEMENT_KINDS } from '@/model';

const INDENT = '  ';

const KIND_ORDER: Readonly<Record<ElementKind, number>> = Object.freeze(
  Object.fromEntries(ELEMENT_KINDS.map((k, i) => [k, i])),
) as Readonly<Record<ElementKind, number>>;

export interface SerializeOptions {
  /**
   * Override the leading file header. Default is a single comment line
   * identifying the writer. Set `null` to omit entirely.
   */
  readonly header?: string | null;
}

export function serializeProject(
  project: Project,
  options: SerializeOptions = {},
): string {
  const byId = new Map<ElementId, ModelElement>();
  for (const e of project.elements) byId.set(e.id, e);

  const containedIds = collectContainedIds(project.elements);
  const topLevel = project.elements.filter((e) => !containedIds.has(e.id));
  const sortedTop = sortElements(topLevel);

  const blocks: string[] = [];

  const header = options.header === undefined
    ? `// SysMLv2 textual notation — project: ${project.name} // id: ${project.id}`
    : options.header;
  if (header !== null) blocks.push(header);

  for (const element of sortedTop) {
    blocks.push(renderElement(element, byId, 0));
  }

  const edgeBlock = renderEdges(project.edges);
  if (edgeBlock) blocks.push(edgeBlock);

  return blocks.join('\n\n') + '\n';
}

function collectContainedIds(elements: readonly ModelElement[]): Set<ElementId> {
  const contained = new Set<ElementId>();
  for (const e of elements) {
    switch (e.kind) {
      case 'Package':
        for (const m of e.memberIds) contained.add(m);
        break;
      case 'PartDefinition':
        for (const m of e.propertyIds) contained.add(m);
        for (const m of e.portIds) contained.add(m);
        break;
      case 'PartUsage':
        for (const m of e.portUsageIds) contained.add(m);
        break;
      case 'InterfaceDefinition':
        for (const m of e.portDefinitionIds) contained.add(m);
        break;
      case 'ActionDefinition':
      case 'ConstraintDefinition':
        for (const m of e.parameterIds) contained.add(m);
        break;
      default:
        break;
    }
  }
  return contained;
}

function sortElements(elements: readonly ModelElement[]): ModelElement[] {
  return [...elements].sort((a, b) => {
    const ka = KIND_ORDER[a.kind];
    const kb = KIND_ORDER[b.kind];
    if (ka !== kb) return ka - kb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function pad(depth: number): string {
  return INDENT.repeat(depth);
}

function idTail(id: string): string {
  return ` // id: ${id}`;
}

function renderElement(
  element: ModelElement,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  switch (element.kind) {
    case 'Package':
      return renderPackage(element, byId, depth);
    case 'PartDefinition':
      return renderPartDefinition(element, byId, depth);
    case 'PartUsage':
      return renderPartUsage(element, byId, depth);
    case 'PortDefinition':
      return renderPortDefinition(element, byId, depth);
    case 'PortUsage':
      return renderPortUsage(element, byId, depth);
    case 'InterfaceDefinition':
      return renderInterfaceDefinition(element, byId, depth);
    case 'ConnectionUsage':
      return renderConnectionUsage(element, depth);
    case 'ItemFlow':
      return renderItemFlow(element, depth);
    case 'Requirement':
      return renderRequirement(element, depth);
    case 'ActionDefinition':
      return renderActionDefinition(element, byId, depth);
    case 'ActionUsage':
      return renderActionUsage(element, byId, depth);
    case 'StateDefinition':
      return renderStateDefinition(element, depth);
    case 'StateUsage':
      return renderStateUsage(element, byId, depth);
    case 'Transition':
      return renderTransition(element, depth);
    case 'UseCase':
      return renderUseCase(element, depth);
    case 'Actor':
      return renderActor(element, depth);
    case 'ConstraintDefinition':
      return renderConstraintDefinition(element, byId, depth);
    case 'ConstraintUsage':
      return renderConstraintUsage(element, byId, depth);
    case 'ValueProperty':
      return renderValueProperty(element, depth);
  }
}

function refName(id: ElementId, byId: Map<ElementId, ModelElement>): string {
  return byId.get(id)?.name ?? '<missing>';
}

function quote(s: string): string {
  return JSON.stringify(s);
}

function renderDoc(doc: string | undefined, depth: number): string[] {
  if (!doc) return [];
  return [`${pad(depth)}doc ${quote(doc)}`];
}

function renderPackage(
  el: PackageElement,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}package ${el.name} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const members: ModelElement[] = [];
  for (const memberId of el.memberIds) {
    const m = byId.get(memberId);
    if (m) members.push(m);
  }
  for (const m of sortElements(members)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPartDefinition(
  el: Extract<ModelElement, { kind: 'PartDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const abstract = el.isAbstract ? 'abstract ' : '';
  const lines: string[] = [];
  lines.push(`${pad(depth)}${abstract}part def ${el.name} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const inner: ModelElement[] = [];
  for (const id of el.portIds) {
    const m = byId.get(id);
    if (m) inner.push(m);
  }
  for (const id of el.propertyIds) {
    const m = byId.get(id);
    if (m) inner.push(m);
  }
  for (const m of sortElements(inner)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPartUsage(
  el: Extract<ModelElement, { kind: 'PartUsage' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const defName = refName(el.definitionId, byId);
  const mult = el.multiplicity ? `[${el.multiplicity}]` : '';
  const lines: string[] = [];
  lines.push(
    `${pad(depth)}part ${el.name} : ${defName}${mult} {${idTail(el.id)}`,
  );
  lines.push(...renderDoc(el.documentation, depth + 1));
  const ports: ModelElement[] = [];
  for (const id of el.portUsageIds) {
    const m = byId.get(id);
    if (m) ports.push(m);
  }
  for (const m of sortElements(ports)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPortDefinition(
  el: Extract<ModelElement, { kind: 'PortDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const iface = el.interfaceId ? ` : ${refName(el.interfaceId, byId)}` : '';
  return `${pad(depth)}port def ${el.direction} ${el.name}${iface};${idTail(el.id)}`;
}

function renderPortUsage(
  el: Extract<ModelElement, { kind: 'PortUsage' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const def = refName(el.definitionId, byId);
  return `${pad(depth)}port ${el.name} : ${def};${idTail(el.id)}`;
}

function renderInterfaceDefinition(
  el: Extract<ModelElement, { kind: 'InterfaceDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}interface def ${el.name} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const ports: ModelElement[] = [];
  for (const id of el.portDefinitionIds) {
    const m = byId.get(id);
    if (m) ports.push(m);
  }
  for (const m of sortElements(ports)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderConnectionUsage(
  el: Extract<ModelElement, { kind: 'ConnectionUsage' }>,
  depth: number,
): string {
  return `${pad(depth)}connection ${el.name} connect ${el.sourceId} to ${el.targetId};${idTail(el.id)}`;
}

function renderItemFlow(
  el: Extract<ModelElement, { kind: 'ItemFlow' }>,
  depth: number,
): string {
  const ofClause = el.itemType ? ` of ${el.itemType}` : '';
  return `${pad(depth)}flow ${el.name}${ofClause} from ${el.sourceId} to ${el.targetId};${idTail(el.id)}`;
}

function renderRequirement(
  el: Extract<ModelElement, { kind: 'Requirement' }>,
  depth: number,
): string {
  const lines: string[] = [];
  const reqId = el.reqId ? ` ${el.reqId}` : '';
  lines.push(`${pad(depth)}requirement${reqId} ${el.name} {${idTail(el.id)}`);
  lines.push(`${pad(depth + 1)}priority ${el.priority};`);
  lines.push(`${pad(depth + 1)}status ${el.status};`);
  lines.push(`${pad(depth + 1)}text ${quote(el.text)};`);
  if (el.rationale) {
    lines.push(`${pad(depth + 1)}rationale ${quote(el.rationale)};`);
  }
  if (el.documentation) {
    lines.push(`${pad(depth + 1)}doc ${quote(el.documentation)};`);
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderActionDefinition(
  el: Extract<ModelElement, { kind: 'ActionDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}action def ${el.name} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const params: ModelElement[] = [];
  for (const id of el.parameterIds) {
    const m = byId.get(id);
    if (m) params.push(m);
  }
  for (const m of sortElements(params)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderActionUsage(
  el: Extract<ModelElement, { kind: 'ActionUsage' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const defClause = el.definitionId
    ? ` : ${refName(el.definitionId, byId)}`
    : '';
  return `${pad(depth)}action ${el.nodeType} ${el.name}${defClause};${idTail(el.id)}`;
}

function renderStateDefinition(
  el: Extract<ModelElement, { kind: 'StateDefinition' }>,
  depth: number,
): string {
  const composite = el.isComposite ? 'composite ' : '';
  return `${pad(depth)}${composite}state def ${el.name};${idTail(el.id)}`;
}

function renderStateUsage(
  el: Extract<ModelElement, { kind: 'StateUsage' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const def = el.definitionId ? ` : ${refName(el.definitionId, byId)}` : '';
  const body: string[] = [];
  if (el.entryAction) body.push(`entry ${quote(el.entryAction)};`);
  if (el.doAction) body.push(`do ${quote(el.doAction)};`);
  if (el.exitAction) body.push(`exit ${quote(el.exitAction)};`);
  if (body.length === 0) {
    return `${pad(depth)}state ${el.stateType} ${el.name}${def};${idTail(el.id)}`;
  }
  const lines: string[] = [];
  lines.push(`${pad(depth)}state ${el.stateType} ${el.name}${def} {${idTail(el.id)}`);
  for (const b of body) lines.push(`${pad(depth + 1)}${b}`);
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderTransition(
  el: Extract<ModelElement, { kind: 'Transition' }>,
  depth: number,
): string {
  const parts: string[] = [];
  if (el.trigger) parts.push(`trigger ${quote(el.trigger)}`);
  if (el.guard) parts.push(`guard ${quote(el.guard)}`);
  if (el.effect) parts.push(`effect ${quote(el.effect)}`);
  const clause = parts.length > 0 ? ` ${parts.join(' ')}` : '';
  return `${pad(depth)}transition ${el.name} first ${el.sourceId} then ${el.targetId}${clause};${idTail(el.id)}`;
}

function renderUseCase(
  el: Extract<ModelElement, { kind: 'UseCase' }>,
  depth: number,
): string {
  if (el.text) {
    const lines: string[] = [];
    lines.push(`${pad(depth)}use case ${el.name} {${idTail(el.id)}`);
    lines.push(`${pad(depth + 1)}text ${quote(el.text)};`);
    lines.push(`${pad(depth)}}`);
    return lines.join('\n');
  }
  return `${pad(depth)}use case ${el.name};${idTail(el.id)}`;
}

function renderActor(
  el: Extract<ModelElement, { kind: 'Actor' }>,
  depth: number,
): string {
  return `${pad(depth)}actor ${el.name};${idTail(el.id)}`;
}

function renderConstraintDefinition(
  el: Extract<ModelElement, { kind: 'ConstraintDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}constraint def ${el.name} {${idTail(el.id)}`);
  lines.push(`${pad(depth + 1)}expr ${quote(el.expression)};`);
  const params: ModelElement[] = [];
  for (const id of el.parameterIds) {
    const m = byId.get(id);
    if (m) params.push(m);
  }
  for (const m of sortElements(params)) {
    lines.push(renderElement(m, byId, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderConstraintUsage(
  el: Extract<ModelElement, { kind: 'ConstraintUsage' }>,
  byId: Map<ElementId, ModelElement>,
  depth: number,
): string {
  const def = refName(el.definitionId, byId);
  return `${pad(depth)}constraint ${el.name} : ${def};${idTail(el.id)}`;
}

function renderValueProperty(
  el: Extract<ModelElement, { kind: 'ValueProperty' }>,
  depth: number,
): string {
  const def = el.defaultValue !== undefined
    ? ` = ${renderLiteral(el.defaultValue)}`
    : '';
  return `${pad(depth)}attribute ${el.name} : ${el.valueType}${def};${idTail(el.id)}`;
}

function renderLiteral(v: ValueLiteral): string {
  if (typeof v === 'string') return quote(v);
  return String(v);
}

const EDGE_KEYWORD: Readonly<Record<ModelEdge['kind'], string>> = Object.freeze({
  Composition: 'composition',
  Generalization: 'generalization',
  RequirementTrace: 'trace',
  ControlFlow: 'control-flow',
  ObjectFlow: 'object-flow',
  Include: 'include',
  Extend: 'extend',
  ParameterBinding: 'binding',
  PackageImport: 'import',
});

function renderEdges(edges: readonly ModelEdge[]): string {
  if (edges.length === 0) return '';
  const sorted = [...edges].sort((a, b) =>
    a.kind === b.kind
      ? a.id < b.id
        ? -1
        : a.id > b.id
        ? 1
        : 0
      : a.kind < b.kind
      ? -1
      : 1,
  );
  const lines: string[] = ['// edges'];
  for (const edge of sorted) {
    const kw = EDGE_KEYWORD[edge.kind];
    const detail = edgeDetail(edge);
    lines.push(
      `${kw}${detail} ${edge.sourceId} -> ${edge.targetId};${idTail(edge.id)}`,
    );
  }
  return lines.join('\n');
}

function edgeDetail(edge: ModelEdge): string {
  switch (edge.kind) {
    case 'RequirementTrace':
      return ` ${edge.traceKind}`;
    case 'ControlFlow':
      return edge.guard ? ` [${edge.guard}]` : '';
    case 'ObjectFlow':
      return edge.itemType ? ` of ${edge.itemType}` : '';
    case 'Extend':
      return edge.extensionPoint ? ` at ${edge.extensionPoint}` : '';
    default:
      return '';
  }
}
