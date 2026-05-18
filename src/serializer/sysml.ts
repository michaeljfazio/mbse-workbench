import type { Project } from '@/repository/types';
import type {
  ElementId,
  ElementKind,
  ModelEdge,
  ModelElement,
  OwnerRole,
  PackageElement,
  ValueLiteral,
} from '@/model';
import { ELEMENT_KINDS } from '@/model';
import {
  buildLibraryIndexForProject,
  findLibraryReferences,
  type LibraryIndex,
} from '@/library';
import type { Diagram } from '@/workspace/diagram';

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

interface ChildIndex {
  /** Children of `id`, sorted by ownerIndex ascending. */
  children(id: ElementId, role?: OwnerRole): readonly ModelElement[];
}

function buildChildIndex(elements: readonly ModelElement[]): ChildIndex {
  const byOwner = new Map<ElementId, ModelElement[]>();
  for (const e of elements) {
    if (e.ownerId === null) continue;
    const bucket = byOwner.get(e.ownerId);
    if (bucket) bucket.push(e);
    else byOwner.set(e.ownerId, [e]);
  }
  for (const bucket of byOwner.values()) {
    bucket.sort((a, b) => a.ownerIndex - b.ownerIndex);
  }
  return {
    children(id, role) {
      const bucket = byOwner.get(id);
      if (!bucket) return [];
      if (role === undefined) return bucket;
      return bucket.filter((c) => c.ownerRole === role);
    },
  };
}

export function serializeProject(
  project: Project,
  options: SerializeOptions = {},
): string {
  const byId = new Map<ElementId, ModelElement>();
  for (const e of project.elements) byId.set(e.id, e);
  const index = buildChildIndex(project.elements);

  // Library index always folds in the canonical standard library, so refs
  // survive even when the caller has stripped library content from
  // `project.elements` before serialising. User-defined library roots in
  // `project.libraryRootIds` are added on top (T-14.06).
  const libraryIndex = buildLibraryIndexForProject(project);

  const topLevel = project.elements
    .filter((e) => e.ownerId === null)
    .filter((e) => !libraryIndex.isLibraryElement(e.id));
  const sortedTop = sortElements(topLevel);

  const blocks: string[] = [];

  const header = options.header === undefined
    ? `// SysMLv2 textual notation — project: ${project.name} // id: ${project.id}`
    : options.header;
  if (header !== null) blocks.push(header);

  const importQualnames = findLibraryReferences(project, libraryIndex);
  if (importQualnames.length > 0) {
    blocks.push(
      importQualnames.map((qn) => `import ${qn}::*;`).join('\n'),
    );
  }

  for (const element of sortedTop) {
    blocks.push(renderElement(element, byId, index, libraryIndex, 0));
  }

  const edgeBlock = renderEdges(project.edges);
  if (edgeBlock) blocks.push(edgeBlock);

  for (const diagram of project.diagrams) {
    const viewBlock = renderDiagram(diagram, byId);
    if (viewBlock !== null) blocks.push(viewBlock);
  }

  return blocks.join('\n\n') + '\n';
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
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  switch (element.kind) {
    case 'Package':
      return renderPackage(element, byId, index, libraryIndex, depth);
    case 'PartDefinition':
      return renderPartDefinition(element, byId, index, libraryIndex, depth);
    case 'PartUsage':
      return renderPartUsage(element, byId, index, libraryIndex, depth);
    case 'PortDefinition':
      return renderPortDefinition(element, byId, libraryIndex, depth);
    case 'PortUsage':
      return renderPortUsage(element, byId, libraryIndex, depth);
    case 'InterfaceDefinition':
      return renderInterfaceDefinition(element, byId, index, libraryIndex, depth);
    case 'ConnectionUsage':
      return renderConnectionUsage(element, depth);
    case 'ItemFlow':
      return renderItemFlow(element, depth);
    case 'Requirement':
      return renderRequirement(element, depth);
    case 'ActionDefinition':
      return renderActionDefinition(element, byId, index, libraryIndex, depth);
    case 'ActionUsage':
      return renderActionUsage(element, byId, libraryIndex, depth);
    case 'StateDefinition':
      return renderStateDefinition(element, depth);
    case 'StateUsage':
      return renderStateUsage(element, byId, libraryIndex, depth);
    case 'Transition':
      return renderTransition(element, depth);
    case 'UseCase':
      return renderUseCase(element, depth);
    case 'Actor':
      return renderActor(element, depth);
    case 'ConstraintDefinition':
      return renderConstraintDefinition(element, byId, index, libraryIndex, depth);
    case 'ConstraintUsage':
      return renderConstraintUsage(element, byId, libraryIndex, depth);
    case 'ValueProperty':
      return renderValueProperty(element, depth);
  }
}

function refName(
  id: ElementId,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
): string {
  return (
    byId.get(id)?.name ?? libraryIndex.shortNameOf(id) ?? '<missing>'
  );
}

// OMG SysMLv2 §4.4.1 — `name ::= regularName | quotedName`. `regularName`
// is `[A-Za-z_][A-Za-z0-9_-]*` (matches the tokenizer's `isIdentStart` /
// `isIdentPart`); anything outside that form is emitted as a `quotedName`
// `<…>`. This lets project names like the default `Untitled Project` and
// any user-authored multi-word identifier survive a SysMLv2-text
// round-trip (issue #446).
const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;
function ident(name: string): string {
  return SAFE_IDENT.test(name) ? name : `<${name}>`;
}

function refIdent(
  id: ElementId,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
): string {
  return ident(refName(id, byId, libraryIndex));
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
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}package ${ident(el.name)} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const members = sortElements(index.children(el.id, 'member'));
  for (const m of members) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPartDefinition(
  el: Extract<ModelElement, { kind: 'PartDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const abstract = el.isAbstract ? 'abstract ' : '';
  const lines: string[] = [];
  lines.push(`${pad(depth)}${abstract}part def ${ident(el.name)} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const inner = [
    ...index.children(el.id, 'port'),
    ...index.children(el.id, 'property'),
  ];
  for (const m of sortElements(inner)) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPartUsage(
  el: Extract<ModelElement, { kind: 'PartUsage' }>,
  byId: Map<ElementId, ModelElement>,
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const defName = refIdent(el.definitionId, byId, libraryIndex);
  const mult = el.multiplicity ? `[${el.multiplicity}]` : '';
  const lines: string[] = [];
  lines.push(
    `${pad(depth)}part ${ident(el.name)} : ${defName}${mult} {${idTail(el.id)}`,
  );
  lines.push(...renderDoc(el.documentation, depth + 1));
  const ports = sortElements(index.children(el.id, 'port'));
  for (const m of ports) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderPortDefinition(
  el: Extract<ModelElement, { kind: 'PortDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const iface = el.interfaceId
    ? ` : ${refIdent(el.interfaceId, byId, libraryIndex)}`
    : '';
  return `${pad(depth)}port def ${el.direction} ${ident(el.name)}${iface};${idTail(el.id)}`;
}

function renderPortUsage(
  el: Extract<ModelElement, { kind: 'PortUsage' }>,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const def = refIdent(el.definitionId, byId, libraryIndex);
  return `${pad(depth)}port ${ident(el.name)} : ${def};${idTail(el.id)}`;
}

function renderInterfaceDefinition(
  el: Extract<ModelElement, { kind: 'InterfaceDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}interface def ${ident(el.name)} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const ports = sortElements(index.children(el.id, 'portDefinition'));
  for (const m of ports) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderConnectionUsage(
  el: Extract<ModelElement, { kind: 'ConnectionUsage' }>,
  depth: number,
): string {
  return `${pad(depth)}connection ${ident(el.name)} connect ${el.sourceId} to ${el.targetId};${idTail(el.id)}`;
}

function renderItemFlow(
  el: Extract<ModelElement, { kind: 'ItemFlow' }>,
  depth: number,
): string {
  const ofClause = el.itemType ? ` of ${ident(el.itemType)}` : '';
  return `${pad(depth)}flow ${ident(el.name)}${ofClause} from ${el.sourceId} to ${el.targetId};${idTail(el.id)}`;
}

function renderRequirement(
  el: Extract<ModelElement, { kind: 'Requirement' }>,
  depth: number,
): string {
  const lines: string[] = [];
  const reqId = el.reqId ? ` ${ident(el.reqId)}` : '';
  lines.push(`${pad(depth)}requirement${reqId} ${ident(el.name)} {${idTail(el.id)}`);
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
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}action def ${ident(el.name)} {${idTail(el.id)}`);
  lines.push(...renderDoc(el.documentation, depth + 1));
  const params = sortElements(index.children(el.id, 'parameter'));
  for (const m of params) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderActionUsage(
  el: Extract<ModelElement, { kind: 'ActionUsage' }>,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const defClause = el.definitionId
    ? ` : ${refIdent(el.definitionId, byId, libraryIndex)}`
    : '';
  return `${pad(depth)}action ${el.nodeType} ${ident(el.name)}${defClause};${idTail(el.id)}`;
}

function renderStateDefinition(
  el: Extract<ModelElement, { kind: 'StateDefinition' }>,
  depth: number,
): string {
  const composite = el.isComposite ? 'composite ' : '';
  return `${pad(depth)}${composite}state def ${ident(el.name)};${idTail(el.id)}`;
}

function renderStateUsage(
  el: Extract<ModelElement, { kind: 'StateUsage' }>,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const def = el.definitionId
    ? ` : ${refIdent(el.definitionId, byId, libraryIndex)}`
    : '';
  const body: string[] = [];
  if (el.entryAction) body.push(`entry ${quote(el.entryAction)};`);
  if (el.doAction) body.push(`do ${quote(el.doAction)};`);
  if (el.exitAction) body.push(`exit ${quote(el.exitAction)};`);
  if (body.length === 0) {
    return `${pad(depth)}state ${el.stateType} ${ident(el.name)}${def};${idTail(el.id)}`;
  }
  const lines: string[] = [];
  lines.push(`${pad(depth)}state ${el.stateType} ${ident(el.name)}${def} {${idTail(el.id)}`);
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
  return `${pad(depth)}transition ${ident(el.name)} first ${el.sourceId} then ${el.targetId}${clause};${idTail(el.id)}`;
}

function renderUseCase(
  el: Extract<ModelElement, { kind: 'UseCase' }>,
  depth: number,
): string {
  if (el.text) {
    const lines: string[] = [];
    lines.push(`${pad(depth)}use case ${ident(el.name)} {${idTail(el.id)}`);
    lines.push(`${pad(depth + 1)}text ${quote(el.text)};`);
    lines.push(`${pad(depth)}}`);
    return lines.join('\n');
  }
  return `${pad(depth)}use case ${ident(el.name)};${idTail(el.id)}`;
}

function renderActor(
  el: Extract<ModelElement, { kind: 'Actor' }>,
  depth: number,
): string {
  return `${pad(depth)}actor ${ident(el.name)};${idTail(el.id)}`;
}

function renderConstraintDefinition(
  el: Extract<ModelElement, { kind: 'ConstraintDefinition' }>,
  byId: Map<ElementId, ModelElement>,
  index: ChildIndex,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const lines: string[] = [];
  lines.push(`${pad(depth)}constraint def ${ident(el.name)} {${idTail(el.id)}`);
  lines.push(`${pad(depth + 1)}expr ${quote(el.expression)};`);
  const params = sortElements(index.children(el.id, 'parameter'));
  for (const m of params) {
    lines.push(renderElement(m, byId, index, libraryIndex, depth + 1));
  }
  lines.push(`${pad(depth)}}`);
  return lines.join('\n');
}

function renderConstraintUsage(
  el: Extract<ModelElement, { kind: 'ConstraintUsage' }>,
  byId: Map<ElementId, ModelElement>,
  libraryIndex: LibraryIndex,
  depth: number,
): string {
  const def = refIdent(el.definitionId, byId, libraryIndex);
  return `${pad(depth)}constraint ${ident(el.name)} : ${def};${idTail(el.id)}`;
}

function renderValueProperty(
  el: Extract<ModelElement, { kind: 'ValueProperty' }>,
  depth: number,
): string {
  const def = el.defaultValue !== undefined
    ? ` = ${renderLiteral(el.defaultValue)}`
    : '';
  return `${pad(depth)}attribute ${ident(el.name)} : ${el.valueType}${def};${idTail(el.id)}`;
}

function renderLiteral(v: ValueLiteral): string {
  if (typeof v === 'string') return quote(v);
  return String(v);
}

const EDGE_KEYWORD: Readonly<Record<ModelEdge['kind'], string>> = Object.freeze({
  Composition: 'composition',
  Aggregation: 'aggregation',
  Generalization: 'generalization',
  Association: 'association',
  Dependency: 'dependency',
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
    // SysML 1.x §9.4 — Association may carry optional multiplicities at
    // each association end. Rendered as `[srcMult]` immediately after the
    // source name and `[tgtMult]` immediately after the target name, e.g.
    // `association src [1] -> tgt [0..*];`. Other edge kinds carry no
    // multiplicities; their source/target chunks come out unbracketed.
    // Issue #434. SysML v2 textual notation for association ends with
    // multiplicities is still being finalised in OMG; the bracketed form
    // matches the 1.x conventional notation and round-trips losslessly
    // through the parser below (see src/parser/sysml.ts `finishEdge`).
    const sourceChunk = formatEdgeEndpoint(edge, edge.sourceId, 'source');
    const targetChunk = formatEdgeEndpoint(edge, edge.targetId, 'target');
    lines.push(
      `${kw}${detail} ${sourceChunk} -> ${targetChunk};${idTail(edge.id)}`,
    );
  }
  return lines.join('\n');
}

function formatEdgeEndpoint(
  edge: ModelEdge,
  endpointId: ElementId,
  role: 'source' | 'target',
): string {
  if (edge.kind !== 'Association') return endpointId;
  const mult =
    role === 'source' ? edge.sourceMultiplicity : edge.targetMultiplicity;
  return mult ? `${endpointId} [${mult}]` : endpointId;
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

/**
 * Renders one `view` block for a diagram whose context element is present in
 * `byId`. Returns `null` when the context element is missing (library or
 * orphaned), so the caller silently skips it — dropping an unresolvable
 * diagram context from the text output is preferable to emitting a broken
 * `expose` reference.
 *
 * Format per OMG SysML v2 §10 and issue #449:
 *   // @viewpoint <viewpointId>
 *   view <Name> { // id: <diagramId>
 *     expose <OwnerPath>;
 *   }
 *
 * The `<OwnerPath>` is the fully-qualified `::` path from the topmost
 * non-null ancestor down to the context element, with each segment quoted
 * via `ident(...)`.
 */
function renderDiagram(
  diagram: Diagram,
  byId: Map<ElementId, ModelElement>,
): string | null {
  const contextEl = byId.get(diagram.context.id);
  if (contextEl === undefined) return null;

  // Build the qualified path by walking up via ownerId.
  const segments: string[] = [ident(contextEl.name)];
  let current: ModelElement | undefined = contextEl;
  while (current !== undefined && current.ownerId !== null) {
    const parent = byId.get(current.ownerId);
    if (parent === undefined) break;
    segments.unshift(ident(parent.name));
    current = parent;
  }

  const exposePath = segments.join('::');
  const lines: string[] = [
    `// @viewpoint ${diagram.viewpointId}`,
    `view ${ident(diagram.name)} {${idTail(diagram.id)}`,
    `${INDENT}expose ${exposePath};`,
    `}`,
  ];
  return lines.join('\n');
}
