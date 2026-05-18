import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ActionDefinitionElement,
  ActionUsageElement,
  AssociationEdge,
  ConnectionUsageElement,
  ConstraintUsageElement,
  ControlFlowEdge,
  ElementId,
  ExtendEdge,
  GeneralizationEdge,
  IncludeEdge,
  ItemFlowElement,
  ModelEdge,
  ModelElement,
  ObjectFlowEdge,
  PackageElement,
  ParameterBindingEdge,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  PortDirection,
  PortUsageElement,
  RequirementElement,
  RequirementPriority,
  RequirementStatus,
  RequirementTraceEdge,
  RequirementTraceKind,
  StateUsageElement,
  TransitionElement,
  UseCaseElement,
  ValueLiteral,
  ValuePropertyElement,
  ValueType,
} from '@/model';
import { isTraceTargetKind } from '@/viewpoints';
import { getActiveDiagram, getActiveViewpoint, useWorkspaceStore } from '../store';
import {
  acceptedChildKinds,
  type ChildKindOption,
} from '../tree/childAcceptance';
import { kindLabel } from '../tree/kindLabels';
import {
  dispatchInspectorCreate,
  inspectorCreatePanel,
  type InspectorCreateAction,
} from './inspectorCreatePanel';
import { LinkRequirementPopover } from './LinkRequirementPopover';

// ADR 0015 step 4 — when an element is selected, the inspector exposes a
// contextual "+ New X" panel whose buttons create X as a *child of the
// selected element* (rather than under the project root). The kinds come
// from the same `acceptedChildKinds(parentKind)` table that drives the
// containment-tree "Create child…" submenu, so authoring rules stay in
// one place.

const CONTEXTUAL_CREATE_NAME_MAX = 30;

function truncateForLabel(name: string): string {
  if (name.length <= CONTEXTUAL_CREATE_NAME_MAX) return name;
  return `${name.slice(0, CONTEXTUAL_CREATE_NAME_MAX - 1)}…`;
}

function contextualParentDisplayName(element: ModelElement): string {
  if (element.name.length > 0) return element.name;
  if (element.kind === 'ActionUsage') return `«${element.nodeType}»`;
  if (element.kind === 'StateUsage') return `«${element.stateType}»`;
  return `(untitled ${element.kind})`;
}

function findElement(
  elements: readonly ModelElement[],
  id: ElementId | undefined,
): ModelElement | undefined {
  if (!id) return undefined;
  return elements.find((e) => e.id === id);
}

function findEdge(
  edges: readonly ModelEdge[],
  id: ElementId | undefined,
): ModelEdge | undefined {
  if (!id) return undefined;
  return edges.find((e) => (e.id as unknown as ElementId) === id);
}

const PORT_DIRECTIONS: readonly { value: PortDirection; label: string }[] = [
  { value: 'in', label: 'in' },
  { value: 'out', label: 'out' },
  { value: 'inout', label: 'inout' },
];

const REQUIREMENT_PRIORITIES: readonly {
  value: RequirementPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const REQUIREMENT_STATUSES: readonly {
  value: RequirementStatus;
  label: string;
}[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export function Inspector(): JSX.Element {
  const selectedIds = useWorkspaceStore((s) => s.selectedElementIds);
  const elements = useWorkspaceStore((s) => s.elements);
  const edges = useWorkspaceStore((s) => s.edges);

  if (selectedIds.length === 0) {
    return <InspectorEmptyState />;
  }

  if (selectedIds.length > 1) {
    return (
      <p data-testid="inspector-multi" className="text-muted-foreground">
        {selectedIds.length} elements selected
      </p>
    );
  }

  const id = selectedIds[0]!;
  const element = findElement(elements, id);
  if (element) {
    return <InspectorSingle element={element} />;
  }
  const edge = findEdge(edges, id);
  if (edge && edge.kind === 'RequirementTrace') {
    return <InspectorTraceEdge edge={edge} />;
  }
  if (edge && edge.kind === 'ControlFlow') {
    return <InspectorControlFlowEdge edge={edge} />;
  }
  if (edge && edge.kind === 'ObjectFlow') {
    return <InspectorObjectFlowEdge edge={edge} />;
  }
  if (edge && edge.kind === 'Include') {
    return <InspectorIncludeEdge edge={edge} />;
  }
  if (edge && edge.kind === 'Extend') {
    return <InspectorExtendEdge edge={edge} />;
  }
  if (edge && edge.kind === 'Generalization') {
    return <InspectorGeneralizationEdge edge={edge} />;
  }
  if (edge && edge.kind === 'Association') {
    return <InspectorAssociationEdge edge={edge} />;
  }
  if (edge && edge.kind === 'ParameterBinding') {
    return <InspectorParameterBindingEdge edge={edge} />;
  }
  return (
    <p data-testid="inspector-missing" className="text-muted-foreground">
      Selected element no longer exists.
    </p>
  );
}

function InspectorEmptyState(): JSX.Element {
  const viewpoint = useWorkspaceStore((s) => getActiveViewpoint(s));
  const diagram = useWorkspaceStore((s) => getActiveDiagram(s));

  if (!viewpoint || !diagram) {
    return (
      <p data-testid="inspector-empty" className="text-muted-foreground">
        Select an element to edit its properties.
      </p>
    );
  }

  const panel = inspectorCreatePanel(viewpoint);

  const handleCreate = (action: InspectorCreateAction): void => {
    // Pull store actions imperatively so the empty-state subscription stays
    // limited to viewpoint + diagram. Capturing them through a useWorkspaceStore
    // selector that returns a fresh object every render would re-fire the
    // subscription and loop the component.
    const state = useWorkspaceStore.getState();
    const id = dispatchInspectorCreate(
      { action, diagram },
      {
        createBlock: state.createBlock,
        createRequirement: state.createRequirement,
        createActionUsage: state.createActionUsage,
        createStateUsage: state.createStateUsage,
        createActor: state.createActor,
        createUseCase: state.createUseCase,
        createConstraintUsage: state.createConstraintUsage,
        createValueProperty: state.createValueProperty,
        createPackage: state.createPackage,
      },
    );
    if (id) state.setSelection([id]);
  };

  return (
    <div
      data-testid="inspector-empty"
      data-viewpoint-id={viewpoint.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {viewpoint.label}
        </span>
        <span className="text-sm font-medium text-foreground">
          Add to this diagram
        </span>
        <span className="text-xs text-muted-foreground">
          Nothing is selected. Create a new element here, or click one on the
          canvas to edit it.
        </span>
      </header>
      {panel.actions.length > 0 ? (
        <div
          data-testid="inspector-empty-actions"
          className="flex flex-col gap-1.5"
        >
          {panel.actions.map((action) => (
            <button
              key={action.key}
              type="button"
              data-testid={`inspector-empty-action-${action.key}`}
              data-element-kind={action.elementKind}
              onClick={() => handleCreate(action)}
              title={action.description}
              className="inline-flex items-center justify-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      {panel.notices.length > 0 ? (
        <ul
          data-testid="inspector-empty-notices"
          className="flex flex-col gap-1.5"
        >
          {panel.notices.map((notice) => (
            <li
              key={notice.key}
              data-testid={`inspector-empty-notice-${notice.key}`}
              className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            >
              <span className="block font-medium text-foreground">
                {notice.label}
              </span>
              <span>{notice.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface InspectorSingleProps {
  readonly element: ModelElement;
}

function InspectorSingle({ element }: InspectorSingleProps): JSX.Element {
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const setElementDescription = useWorkspaceStore((s) => s.setElementDescription);

  return (
    <div
      data-testid="inspector-single"
      data-element-id={element.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {element.kind}
        </span>
        <span className="text-sm font-medium text-foreground">Properties</span>
      </header>

      <NameField
        element={element}
        onCommit={(name) => renameElement(element.id, name)}
      />
      <DescriptionField
        element={element}
        onCommit={(desc) => setElementDescription(element.id, desc)}
      />

      {element.kind === 'Package' ? (
        <PackageExtras element={element} />
      ) : null}

      {element.kind === 'PartDefinition' ? (
        <PartDefinitionExtras element={element} />
      ) : null}

      {element.kind === 'PartUsage' ? (
        <PartUsageExtras element={element} />
      ) : null}

      {element.kind === 'ConnectionUsage' ? (
        <ConnectionUsageExtras element={element} />
      ) : null}

      {element.kind === 'ItemFlow' ? (
        <ItemFlowExtras element={element} />
      ) : null}

      {element.kind === 'Requirement' ? (
        <RequirementExtras element={element} />
      ) : null}

      {element.kind === 'ActionUsage' ? (
        <ActionUsageExtras element={element} />
      ) : null}

      {element.kind === 'ActionDefinition' ? (
        <ActionDefinitionExtras element={element} />
      ) : null}

      {element.kind === 'StateUsage' ? (
        <StateUsageExtras element={element} />
      ) : null}

      {element.kind === 'Transition' ? (
        <TransitionExtras element={element} />
      ) : null}

      {element.kind === 'UseCase' ? (
        <UseCaseExtras element={element} />
      ) : null}

      {element.kind === 'ConstraintUsage' ? (
        <ConstraintUsageExtras element={element} />
      ) : null}

      {element.kind === 'ValueProperty' ? (
        <ValuePropertyExtras element={element} />
      ) : null}

      {isTraceTargetKind(element.kind) ? (
        <TraceLinksExtras element={element} />
      ) : null}

      <InspectorContextualCreate element={element} />

      <OwnerField element={element} />
    </div>
  );
}

interface InspectorContextualCreateProps {
  readonly element: ModelElement;
}

/**
 * ADR 0015 step 4 — contextual creation affordance for the inspector's
 * single-selection view. Renders a `+ New <kind>` button per option
 * returned by `acceptedChildKinds(element.kind)`; each button dispatches
 * `createChildElement(element.id, …)` so the new element lands as a
 * child of the currently-selected parent (NOT under the project root).
 * Hidden entirely when the selected element accepts no children — kinds
 * like `PartUsage` or `ConnectionUsage` are not authoring parents.
 *
 * Label format: `Add to <truncated parent name>: + New <kind>` — discloses
 * the parent up-front so the operator never wonders where the new element
 * lands. The label uses `kindLabel(kind).singular` (canonical metamodel
 * vocabulary), matching the ADR 0015 vocabulary cleanup.
 */
function InspectorContextualCreate({
  element,
}: InspectorContextualCreateProps): JSX.Element | null {
  const createChildElement = useWorkspaceStore((s) => s.createChildElement);
  const setSelection = useWorkspaceStore((s) => s.setSelection);

  const options = acceptedChildKinds(element.kind);
  if (options.length === 0) return null;

  const parentLabel = truncateForLabel(contextualParentDisplayName(element));

  const handleCreate = (option: ChildKindOption): void => {
    const childKindLabel = kindLabel(option.kind).singular;
    const defaultName = `New ${childKindLabel}`;
    const newId = createChildElement(
      element.id,
      option.kind,
      option.ownerRole,
      defaultName,
    );
    if (!newId) return;
    setSelection([newId]);
  };

  return (
    <div
      data-testid="inspector-contextual-create"
      data-parent-id={element.id}
      data-parent-kind={element.kind}
      className="flex flex-col gap-1.5"
    >
      <span
        data-testid="inspector-contextual-create-header"
        className="text-xs font-medium text-muted-foreground"
      >
        {`Add to ${parentLabel}`}
      </span>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const childKindLabel = kindLabel(option.kind).singular;
          return (
            <button
              key={`${option.kind}.${option.ownerRole}`}
              type="button"
              data-testid={`inspector-contextual-create-action-${option.kind}-${option.ownerRole}`}
              data-element-kind={option.kind}
              data-owner-role={option.ownerRole}
              onClick={() => handleCreate(option)}
              className="inline-flex items-center justify-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition hover:bg-accent focus:border-primary focus:outline-none"
            >
              {`+ New ${childKindLabel}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface NameFieldProps {
  readonly element: ModelElement;
  readonly onCommit: (name: string) => void;
}

function NameField({ element, onCommit }: NameFieldProps): JSX.Element {
  const [draft, setDraft] = useState(element.name);
  useEffect(() => {
    setDraft(element.name);
  }, [element.id, element.name]);
  const inputId = useMemo(() => `inspector-name-${element.id}`, [element.id]);

  const commit = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setDraft(element.name);
      return;
    }
    if (trimmed !== element.name) onCommit(trimmed);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        Name
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        data-testid="inspector-name"
        required
        aria-required="true"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(element.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

interface DescriptionFieldProps {
  readonly element: ModelElement;
  readonly onCommit: (description: string) => void;
}

function DescriptionField({
  element,
  onCommit,
}: DescriptionFieldProps): JSX.Element {
  const [draft, setDraft] = useState(element.documentation ?? '');
  useEffect(() => {
    setDraft(element.documentation ?? '');
  }, [element.id, element.documentation]);
  const inputId = useMemo(
    () => `inspector-description-${element.id}`,
    [element.id],
  );

  const commit = (): void => {
    if (draft !== (element.documentation ?? '')) onCommit(draft);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        Description
      </label>
      <textarea
        id={inputId}
        value={draft}
        data-testid="inspector-description"
        rows={4}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className="resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function OwnerField({ element }: { element: ModelElement }): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Owner</span>
      <span
        data-testid="inspector-owner"
        className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
      >
        {element.ownerId ?? 'unassigned'}
      </span>
    </div>
  );
}

interface PackageExtrasProps {
  readonly element: PackageElement;
}

function PackageExtras({ element }: PackageExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const addPackageMember = useWorkspaceStore((s) => s.addPackageMember);
  const removePackageMember = useWorkspaceStore((s) => s.removePackageMember);
  const setSelection = useWorkspaceStore((s) => s.setSelection);

  const members = useMemo(() => {
    return elements
      .filter((e) => e.ownerId === element.id && e.ownerRole === 'member')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [elements, element.id]);

  // Membership is exclusive across packages: an element belongs to at most
  // one Package via its containment ownerId. Candidates for "add member"
  // are non-Package elements currently held by some other package (i.e.
  // not already in this one).
  const candidates = useMemo(() => {
    return elements
      .filter(
        (e) =>
          e.kind !== 'Package' &&
          e.ownerRole === 'member' &&
          e.ownerId !== element.id,
      )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [elements, element.id]);

  const [pick, setPick] = useState<ElementId | ''>('');

  const handleAdd = (): void => {
    if (!pick) return;
    addPackageMember(element.id, pick as ElementId);
    setPick('');
  };

  return (
    <div data-testid="inspector-package-members" className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Members</span>
      {members.length === 0 ? (
        <p
          data-testid="inspector-package-members-empty"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
        >
          No members — add an existing element to group it under this package.
        </p>
      ) : (
        <ul
          data-testid="inspector-package-member-list"
          className="flex flex-col gap-1"
        >
          {members.map((m) => (
            <li
              key={m.id}
              data-testid={`inspector-package-member-row-${m.id}`}
              data-element-id={m.id}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1"
            >
              <button
                type="button"
                onClick={() => setSelection([m.id])}
                className="flex-1 truncate text-left text-sm text-foreground hover:underline focus:outline-none"
              >
                <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.kind}
                </span>
                {m.name}
              </button>
              <button
                type="button"
                data-testid={`inspector-package-member-remove-${m.id}`}
                aria-label={`Remove member ${m.name}`}
                onClick={() => removePackageMember(element.id, m.id)}
                className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus:outline-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1">
        <label htmlFor={`inspector-package-add-${element.id}`} className="sr-only">
          Add member
        </label>
        <select
          id={`inspector-package-add-${element.id}`}
          data-testid="inspector-package-add-select"
          value={pick}
          onChange={(e) => setPick(e.target.value as ElementId | '')}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Pick an element…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kind} — {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="inspector-package-add"
          onClick={handleAdd}
          disabled={!pick}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent focus:border-primary focus:outline-none disabled:opacity-50"
        >
          + Add member
        </button>
      </div>
    </div>
  );
}

interface PartDefinitionExtrasProps {
  readonly element: PartDefinitionElement;
}

function PartDefinitionExtras({
  element,
}: PartDefinitionExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const addPortToDefinition = useWorkspaceStore(
    (s) => s.addPortToDefinition,
  );
  const openInternalDiagram = useWorkspaceStore((s) => s.openInternalDiagram);

  const ports = useMemo(() => {
    return elements.filter(
      (e): e is PortDefinitionElement =>
        e.kind === 'PortDefinition' &&
        e.ownerId === element.id &&
        e.ownerRole === 'port',
    );
  }, [elements, element.id]);

  return (
    <>
      <div
        data-testid="inspector-ports"
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Ports
          </span>
          <button
            type="button"
            data-testid="inspector-add-port"
            onClick={() => addPortToDefinition(element.id)}
            className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent focus:border-primary focus:outline-none"
          >
            + Add port
          </button>
        </div>
        {ports.length === 0 ? (
          <p
            data-testid="inspector-ports-empty"
            className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
          >
            No ports — add one to expose an interface point.
          </p>
        ) : (
          <ul
            data-testid="inspector-port-list"
            className="flex flex-col gap-1"
          >
            {ports.map((port) => (
              <PortRow key={port.id} port={port} />
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        data-testid="inspector-open-internal-diagram"
        onClick={() => openInternalDiagram(element.id)}
        className="self-start rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent focus:border-primary focus:outline-none"
      >
        Open Internal Diagram
      </button>
    </>
  );
}

interface PortRowProps {
  readonly port: PortDefinitionElement;
}

function PortRow({ port }: PortRowProps): JSX.Element {
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const setPortDirection = useWorkspaceStore((s) => s.setPortDirection);
  const deletePort = useWorkspaceStore((s) => s.deletePort);

  const [draft, setDraft] = useState(port.name);
  useEffect(() => setDraft(port.name), [port.id, port.name]);
  const nameId = useMemo(() => `inspector-port-name-${port.id}`, [port.id]);
  const dirId = useMemo(() => `inspector-port-dir-${port.id}`, [port.id]);

  const commit = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setDraft(port.name);
      return;
    }
    if (trimmed !== port.name) renameElement(port.id, trimmed);
  };

  return (
    <li
      data-testid={`inspector-port-row-${port.id}`}
      data-port-id={port.id}
      className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1"
    >
      <label htmlFor={nameId} className="sr-only">
        Port name
      </label>
      <input
        id={nameId}
        type="text"
        value={draft}
        data-testid={`inspector-port-name-${port.id}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(port.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
      <label htmlFor={dirId} className="sr-only">
        Port direction
      </label>
      <select
        id={dirId}
        value={port.direction}
        data-testid={`inspector-port-dir-${port.id}`}
        onChange={(e) =>
          setPortDirection(port.id, e.target.value as PortDirection)
        }
        className="rounded-sm border border-border bg-card px-1 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
      >
        {PORT_DIRECTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        data-testid={`inspector-port-delete-${port.id}`}
        aria-label={`Delete port ${port.name}`}
        onClick={() => deletePort(port.id)}
        className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus:outline-none"
      >
        ×
      </button>
    </li>
  );
}

interface ConnectionUsageExtrasProps {
  readonly element: ConnectionUsageElement;
}

function ConnectionUsageExtras({
  element,
}: ConnectionUsageExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);

  const sourceLabel = useMemo(
    () => describeConnectionEndpoint(elements, element.sourceId),
    [elements, element.sourceId],
  );
  const targetLabel = useMemo(
    () => describeConnectionEndpoint(elements, element.targetId),
    [elements, element.targetId],
  );

  return (
    <div
      data-testid="inspector-connection-endpoints"
      className="flex flex-col gap-1.5"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Endpoints
      </span>
      <dl className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-connection-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-connection-target">{targetLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

interface InspectorTraceEdgeProps {
  readonly edge: RequirementTraceEdge;
}

function InspectorTraceEdge({ edge }: InspectorTraceEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setRequirementTraceLabel = useWorkspaceStore(
    (s) => s.setRequirementTraceLabel,
  );

  const sourceLabel = useMemo(
    () => describeTraceEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeTraceEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [draft, setDraft] = useState(edge.label ?? '');
  useEffect(() => {
    setDraft(edge.label ?? '');
  }, [edge.id, edge.label]);
  const inputId = useMemo(
    () => `inspector-trace-label-${edge.id}`,
    [edge.id],
  );

  const commit = (): void => {
    if (draft !== (edge.label ?? '')) {
      setRequirementTraceLabel(edge.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-trace-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          RequirementTrace
        </span>
        <span className="text-sm font-medium text-foreground">
          Trace properties
        </span>
      </header>
      <dl
        data-testid="inspector-trace-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-trace-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-trace-target">{targetLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Kind</dt>
          <dd data-testid="inspector-trace-kind">{`«${edge.traceKind}»`}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Label
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-trace-label"
          placeholder="Optional edge label"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(edge.label ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function describeTraceEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el) return 'unknown';
  if (el.kind === 'Requirement' && el.reqId) {
    return `${el.reqId} ${el.name}`;
  }
  return `${el.kind} · ${el.name}`;
}

function describeActivityEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el || el.kind !== 'ActionUsage') return 'unknown';
  if (el.name.length > 0) return el.name;
  return `«${el.nodeType}»`;
}

interface InspectorControlFlowEdgeProps {
  readonly edge: ControlFlowEdge;
}

function InspectorControlFlowEdge({
  edge,
}: InspectorControlFlowEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setControlFlowGuard = useWorkspaceStore((s) => s.setControlFlowGuard);

  const sourceLabel = useMemo(
    () => describeActivityEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeActivityEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [draft, setDraft] = useState(edge.guard ?? '');
  useEffect(() => {
    setDraft(edge.guard ?? '');
  }, [edge.id, edge.guard]);
  const inputId = useMemo(
    () => `inspector-control-flow-guard-${edge.id}`,
    [edge.id],
  );

  const commit = (): void => {
    if (draft !== (edge.guard ?? '')) {
      setControlFlowGuard(edge.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-control-flow-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          ControlFlow
        </span>
        <span className="text-sm font-medium text-foreground">
          Control flow properties
        </span>
      </header>
      <dl
        data-testid="inspector-control-flow-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-control-flow-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-control-flow-target">{targetLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Guard
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-control-flow-guard"
          placeholder="e.g. fuel > 0"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(edge.guard ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

interface InspectorObjectFlowEdgeProps {
  readonly edge: ObjectFlowEdge;
}

function InspectorObjectFlowEdge({
  edge,
}: InspectorObjectFlowEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setObjectFlowItemType = useWorkspaceStore(
    (s) => s.setObjectFlowItemType,
  );

  const sourceLabel = useMemo(
    () => describeActivityEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeActivityEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [draft, setDraft] = useState(edge.itemType ?? '');
  useEffect(() => {
    setDraft(edge.itemType ?? '');
  }, [edge.id, edge.itemType]);
  const inputId = useMemo(
    () => `inspector-object-flow-item-type-${edge.id}`,
    [edge.id],
  );

  const commit = (): void => {
    if (draft !== (edge.itemType ?? '')) {
      setObjectFlowItemType(edge.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-object-flow-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          ObjectFlow
        </span>
        <span className="text-sm font-medium text-foreground">
          Object flow properties
        </span>
      </header>
      <dl
        data-testid="inspector-object-flow-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-object-flow-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-object-flow-target">{targetLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Item type
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-object-flow-item-type"
          placeholder="e.g. Token, Order, Message"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(edge.itemType ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function describeUseCaseEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el) return 'unknown';
  if (el.kind === 'Actor' || el.kind === 'UseCase') {
    return el.name.length > 0 ? el.name : `«${el.kind}»`;
  }
  return `${el.kind} · ${el.name}`;
}

interface InspectorIncludeEdgeProps {
  readonly edge: IncludeEdge;
}

function InspectorIncludeEdge({ edge }: InspectorIncludeEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const sourceLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  return (
    <div
      data-testid="inspector-include-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          Include
        </span>
        <span className="text-sm font-medium text-foreground">
          «include» relationship
        </span>
      </header>
      <dl
        data-testid="inspector-include-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-include-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-include-target">{targetLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

interface InspectorExtendEdgeProps {
  readonly edge: ExtendEdge;
}

function InspectorExtendEdge({ edge }: InspectorExtendEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setExtendExtensionPoint = useWorkspaceStore(
    (s) => s.setExtendExtensionPoint,
  );

  const sourceLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [draft, setDraft] = useState(edge.extensionPoint ?? '');
  useEffect(() => {
    setDraft(edge.extensionPoint ?? '');
  }, [edge.id, edge.extensionPoint]);
  const inputId = useMemo(
    () => `inspector-extend-extension-point-${edge.id}`,
    [edge.id],
  );

  const commit = (): void => {
    if (draft !== (edge.extensionPoint ?? '')) {
      setExtendExtensionPoint(edge.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-extend-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          Extend
        </span>
        <span className="text-sm font-medium text-foreground">
          «extend» relationship
        </span>
      </header>
      <dl
        data-testid="inspector-extend-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-extend-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-extend-target">{targetLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Extension point
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-extend-extension-point"
          placeholder="e.g. afterPayment"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(edge.extensionPoint ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

interface InspectorGeneralizationEdgeProps {
  readonly edge: GeneralizationEdge;
}

function InspectorGeneralizationEdge({
  edge,
}: InspectorGeneralizationEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const sourceLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeUseCaseEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  return (
    <div
      data-testid="inspector-generalization-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          Generalization
        </span>
        <span className="text-sm font-medium text-foreground">
          Inheritance relationship
        </span>
      </header>
      <dl
        data-testid="inspector-generalization-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-generalization-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-generalization-target">{targetLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

function describeBddEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el) return 'unknown';
  if (el.kind === 'PartDefinition') return el.name;
  return `${el.kind} · ${el.name}`;
}

interface InspectorAssociationEdgeProps {
  readonly edge: AssociationEdge;
}

// SysML 1.x §9.4 — Association edges may carry a multiplicity at each end
// (`1`, `0..*`, ...). This inspector surfaces two free-text inputs that
// dispatch via the standard `update-edge` command path (see store.ts
// `setAssociationSourceMultiplicity`/`setAssociationTargetMultiplicity`).
// Issue #434.
function InspectorAssociationEdge({
  edge,
}: InspectorAssociationEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setSourceMult = useWorkspaceStore(
    (s) => s.setAssociationSourceMultiplicity,
  );
  const setTargetMult = useWorkspaceStore(
    (s) => s.setAssociationTargetMultiplicity,
  );

  const sourceLabel = useMemo(
    () => describeBddEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeBddEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [sourceDraft, setSourceDraft] = useState(edge.sourceMultiplicity ?? '');
  useEffect(() => {
    setSourceDraft(edge.sourceMultiplicity ?? '');
  }, [edge.id, edge.sourceMultiplicity]);

  const [targetDraft, setTargetDraft] = useState(edge.targetMultiplicity ?? '');
  useEffect(() => {
    setTargetDraft(edge.targetMultiplicity ?? '');
  }, [edge.id, edge.targetMultiplicity]);

  const sourceInputId = useMemo(
    () => `inspector-edge-multiplicity-source-${edge.id}`,
    [edge.id],
  );
  const targetInputId = useMemo(
    () => `inspector-edge-multiplicity-target-${edge.id}`,
    [edge.id],
  );

  const commitSource = (): void => {
    if (sourceDraft !== (edge.sourceMultiplicity ?? '')) {
      setSourceMult(edge.id, sourceDraft);
    }
  };
  const commitTarget = (): void => {
    if (targetDraft !== (edge.targetMultiplicity ?? '')) {
      setTargetMult(edge.id, targetDraft);
    }
  };

  return (
    <div
      data-testid="inspector-association-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          Association
        </span>
        <span className="text-sm font-medium text-foreground">
          Block association
        </span>
      </header>
      <dl
        data-testid="inspector-association-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-association-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-association-target">{targetLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={sourceInputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Source multiplicity
        </label>
        <input
          id={sourceInputId}
          type="text"
          value={sourceDraft}
          data-testid="inspector-edge-multiplicity-source"
          placeholder="e.g. 1, 0..1, 1..*"
          onChange={(e) => setSourceDraft(e.target.value)}
          onBlur={commitSource}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setSourceDraft(edge.sourceMultiplicity ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={targetInputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Target multiplicity
        </label>
        <input
          id={targetInputId}
          type="text"
          value={targetDraft}
          data-testid="inspector-edge-multiplicity-target"
          placeholder="e.g. 1, 0..*, 1..*"
          onChange={(e) => setTargetDraft(e.target.value)}
          onBlur={commitTarget}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setTargetDraft(edge.targetMultiplicity ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function describeConnectionEndpoint(
  elements: readonly ModelElement[],
  portUsageId: ElementId,
): string {
  const portUsage = elements.find(
    (e): e is PortUsageElement => e.kind === 'PortUsage' && e.id === portUsageId,
  );
  if (!portUsage) return 'unknown';
  const def = elements.find(
    (e): e is PortDefinitionElement =>
      e.kind === 'PortDefinition' && e.id === portUsage.definitionId,
  );
  const owner = elements.find(
    (e): e is PartUsageElement =>
      e.kind === 'PartUsage' && e.id === portUsage.ownerId,
  );
  const parts = [
    owner?.name ?? 'unknown',
    portUsage.name,
  ];
  const direction = def?.direction;
  return direction ? `${parts.join('.')} (${direction})` : parts.join('.');
}

interface PartUsageExtrasProps {
  readonly element: PartUsageElement;
}

function PartUsageExtras({ element }: PartUsageExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setPartUsageMultiplicity = useWorkspaceStore(
    (s) => s.setPartUsageMultiplicity,
  );

  const definition = useMemo(
    () =>
      elements.find(
        (e): e is PartDefinitionElement =>
          e.kind === 'PartDefinition' && e.id === element.definitionId,
      ),
    [elements, element.definitionId],
  );

  const [draft, setDraft] = useState(element.multiplicity ?? '');
  useEffect(() => {
    setDraft(element.multiplicity ?? '');
  }, [element.id, element.multiplicity]);
  const multId = useMemo(
    () => `inspector-multiplicity-${element.id}`,
    [element.id],
  );

  const commit = (): void => {
    if (draft !== (element.multiplicity ?? '')) {
      setPartUsageMultiplicity(element.id, draft);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Definition
        </span>
        <span
          data-testid="inspector-definition"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
        >
          {definition?.name ?? 'unknown'}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={multId}
          className="text-xs font-medium text-muted-foreground"
        >
          Multiplicity
        </label>
        <input
          id={multId}
          type="text"
          value={draft}
          data-testid="inspector-multiplicity"
          placeholder="e.g. 1, 0..1, 1..*"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(element.multiplicity ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </>
  );
}

interface RequirementExtrasProps {
  readonly element: RequirementElement;
}

function RequirementExtras({ element }: RequirementExtrasProps): JSX.Element {
  const setRequirementReqId = useWorkspaceStore(
    (s) => s.setRequirementReqId,
  );
  const setRequirementText = useWorkspaceStore((s) => s.setRequirementText);
  const setRequirementPriority = useWorkspaceStore(
    (s) => s.setRequirementPriority,
  );
  const setRequirementStatus = useWorkspaceStore(
    (s) => s.setRequirementStatus,
  );
  const setRequirementRationale = useWorkspaceStore(
    (s) => s.setRequirementRationale,
  );

  const [reqIdDraft, setReqIdDraft] = useState(element.reqId ?? '');
  useEffect(() => {
    setReqIdDraft(element.reqId ?? '');
  }, [element.id, element.reqId]);
  const reqIdInputId = useMemo(
    () => `inspector-req-id-${element.id}`,
    [element.id],
  );
  const commitReqId = (): void => {
    if (reqIdDraft !== (element.reqId ?? '')) {
      setRequirementReqId(element.id, reqIdDraft);
    }
  };

  const [textDraft, setTextDraft] = useState(element.text);
  useEffect(() => {
    setTextDraft(element.text);
  }, [element.id, element.text]);
  const textInputId = useMemo(
    () => `inspector-req-text-${element.id}`,
    [element.id],
  );
  const commitText = (): void => {
    if (textDraft !== element.text) {
      setRequirementText(element.id, textDraft);
    }
  };

  const priorityId = useMemo(
    () => `inspector-req-priority-${element.id}`,
    [element.id],
  );
  const statusId = useMemo(
    () => `inspector-req-status-${element.id}`,
    [element.id],
  );

  const [rationaleDraft, setRationaleDraft] = useState(
    element.rationale ?? '',
  );
  useEffect(() => {
    setRationaleDraft(element.rationale ?? '');
  }, [element.id, element.rationale]);
  const rationaleInputId = useMemo(
    () => `inspector-req-rationale-${element.id}`,
    [element.id],
  );
  const commitRationale = (): void => {
    if (rationaleDraft !== (element.rationale ?? '')) {
      setRequirementRationale(element.id, rationaleDraft);
    }
  };

  return (
    <div
      data-testid="inspector-requirement"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={reqIdInputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Requirement ID
        </label>
        <input
          id={reqIdInputId}
          type="text"
          value={reqIdDraft}
          data-testid="inspector-req-id"
          placeholder="e.g. R-001"
          onChange={(e) => setReqIdDraft(e.target.value)}
          onBlur={commitReqId}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setReqIdDraft(element.reqId ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={priorityId}
          className="text-xs font-medium text-muted-foreground"
        >
          Priority
        </label>
        <select
          id={priorityId}
          value={element.priority}
          data-testid="inspector-req-priority"
          onChange={(e) =>
            setRequirementPriority(
              element.id,
              e.target.value as RequirementPriority,
            )
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        >
          {REQUIREMENT_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={statusId}
          className="text-xs font-medium text-muted-foreground"
        >
          Status
        </label>
        <select
          id={statusId}
          value={element.status}
          data-testid="inspector-req-status"
          onChange={(e) =>
            setRequirementStatus(
              element.id,
              e.target.value as RequirementStatus,
            )
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        >
          {REQUIREMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textInputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Text
        </label>
        <textarea
          id={textInputId}
          value={textDraft}
          data-testid="inspector-req-text"
          rows={4}
          placeholder="What shall the system do?"
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          className="resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={rationaleInputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Rationale
        </label>
        <input
          id={rationaleInputId}
          type="text"
          value={rationaleDraft}
          data-testid="inspector-req-rationale"
          placeholder="Why this requirement exists"
          onChange={(e) => setRationaleDraft(e.target.value)}
          onBlur={commitRationale}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setRationaleDraft(element.rationale ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

interface ItemFlowExtrasProps {
  readonly element: ItemFlowElement;
}

function ItemFlowExtras({ element }: ItemFlowExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setItemFlowType = useWorkspaceStore((s) => s.setItemFlowType);

  const sourceLabel = useMemo(
    () => describeConnectionEndpoint(elements, element.sourceId),
    [elements, element.sourceId],
  );
  const targetLabel = useMemo(
    () => describeConnectionEndpoint(elements, element.targetId),
    [elements, element.targetId],
  );

  const [draft, setDraft] = useState(element.itemType ?? '');
  useEffect(() => {
    setDraft(element.itemType ?? '');
  }, [element.id, element.itemType]);
  const inputId = useMemo(
    () => `inspector-item-type-${element.id}`,
    [element.id],
  );

  const commit = (): void => {
    if (draft !== (element.itemType ?? '')) {
      setItemFlowType(element.id, draft);
    }
  };

  return (
    <>
      <div
        data-testid="inspector-itemflow-endpoints"
        className="flex flex-col gap-1.5"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Endpoints
        </span>
        <dl className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-semibold uppercase tracking-wide">Source</dt>
            <dd data-testid="inspector-itemflow-source">{sourceLabel}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold uppercase tracking-wide">Target</dt>
            <dd data-testid="inspector-itemflow-target">{targetLabel}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Item type
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-item-type"
          placeholder="e.g. Fuel, kWh, Message"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(element.itemType ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </>
  );
}

interface TraceLinksExtrasProps {
  readonly element: ModelElement;
}

function TraceLinksExtras({ element }: TraceLinksExtrasProps): JSX.Element {
  const edges = useWorkspaceStore((s) => s.edges);
  const elements = useWorkspaceStore((s) => s.elements);
  const registry = useWorkspaceStore((s) => s.registry);
  const linkRequirementTrace = useWorkspaceStore(
    (s) => s.linkRequirementTrace,
  );
  const unlinkEdge = useWorkspaceStore((s) => s.unlinkEdge);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);

  const incoming = useMemo(
    () =>
      edges.filter(
        (e): e is RequirementTraceEdge =>
          e.kind === 'RequirementTrace' && e.targetId === element.id,
      ),
    [edges, element.id],
  );

  const requirements = useMemo(
    () =>
      elements.filter(
        (e): e is RequirementElement => e.kind === 'Requirement',
      ),
    [elements],
  );

  const allowedKindsFor = useMemo(() => {
    return (requirement: RequirementElement): readonly RequirementTraceKind[] => {
      if (!registry) return [];
      if (requirement.id === element.id) return [];
      // validTraceKindsFor in isValidConnection.ts only depends on the kind
      // pair: Requirement→Requirement allows all four; Requirement→other
      // allows only satisfy/verify per ADR 0004 § 3.
      if (element.kind === 'Requirement') {
        return ['derive', 'satisfy', 'verify', 'refine'];
      }
      return ['satisfy', 'verify'];
    };
  }, [element.id, element.kind, registry]);

  const openPopover = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const popoverWidth = 320;
    const viewportWidth = window.innerWidth;
    const x = Math.max(
      8,
      Math.min(rect.right - popoverWidth, viewportWidth - popoverWidth - 8),
    );
    const y = rect.bottom + 4;
    setPopover({ x, y });
  };

  const handlePick = (
    requirement: RequirementElement,
    kind: RequirementTraceKind,
  ): void => {
    linkRequirementTrace(requirement.id, element.id, kind);
    setPopover(null);
  };

  return (
    <div
      data-testid="inspector-trace-links"
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Linked requirements
        </span>
        <button
          ref={triggerRef}
          type="button"
          data-testid="inspector-add-trace-link"
          onClick={openPopover}
          className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent focus:border-primary focus:outline-none"
        >
          + Link requirement
        </button>
      </div>
      {incoming.length === 0 ? (
        <p
          data-testid="inspector-trace-links-empty"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
        >
          No requirement links
        </p>
      ) : (
        <div
          data-testid="inspector-trace-link-list"
          className="flex flex-col gap-1"
        >
          {incoming.map((edge) => (
            <TraceLinkRow
              key={edge.id}
              edge={edge}
              source={
                elements.find((e) => e.id === edge.sourceId) as
                  | RequirementElement
                  | undefined
              }
              onUnlink={() => unlinkEdge(edge.id)}
            />
          ))}
        </div>
      )}
      {popover ? (
        <LinkRequirementPopover
          x={popover.x}
          y={popover.y}
          requirements={requirements}
          allowedKindsFor={allowedKindsFor}
          onPick={handlePick}
          onCancel={() => setPopover(null)}
        />
      ) : null}
    </div>
  );
}

interface TraceLinkRowProps {
  readonly edge: RequirementTraceEdge;
  readonly source: RequirementElement | undefined;
  readonly onUnlink: () => void;
}

function TraceLinkRow({
  edge,
  source,
  onUnlink,
}: TraceLinkRowProps): JSX.Element {
  return (
    <div
      data-testid={`inspector-trace-link-${edge.id}`}
      data-trace-kind={edge.traceKind}
      className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground/85"
    >
      <span className="font-mono text-[10px] text-foreground/75">
        «{edge.traceKind}»
      </span>
      <span className="flex-1 truncate">
        {source ? (
          <>
            {source.reqId ? (
              <span className="mr-1 font-mono text-[10px] text-foreground/75">
                {source.reqId}
              </span>
            ) : null}
            <span className="font-medium text-foreground">{source.name}</span>
          </>
        ) : (
          <span className="text-foreground/75">unknown</span>
        )}
      </span>
      <button
        type="button"
        data-testid={`inspector-trace-link-delete-${edge.id}`}
        aria-label={`Unlink ${edge.traceKind} requirement${source ? ` ${source.name}` : ''}`}
        onClick={onUnlink}
        className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus:outline-none"
      >
        ×
      </button>
    </div>
  );
}

interface ActionUsageExtrasProps {
  readonly element: ActionUsageElement;
}

function ActionUsageExtras({ element }: ActionUsageExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setActionDefinition = useWorkspaceStore((s) => s.setActionDefinition);

  const definitions = useMemo(
    () =>
      elements
        .filter(
          (e): e is ActionDefinitionElement => e.kind === 'ActionDefinition',
        )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [elements],
  );

  const defId = useMemo(
    () => `inspector-action-definition-${element.id}`,
    [element.id],
  );

  return (
    <div data-testid="inspector-action" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Node type
        </span>
        <span
          data-testid="inspector-action-node-type"
          className="self-start rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80"
        >
          {element.nodeType}
        </span>
      </div>
      {element.nodeType === 'action' ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={defId}
            className="text-xs font-medium text-muted-foreground"
          >
            Definition
          </label>
          <select
            id={defId}
            data-testid="inspector-action-definition"
            value={element.definitionId ?? ''}
            onChange={(e) =>
              setActionDefinition(
                element.id,
                e.target.value.length === 0
                  ? null
                  : (e.target.value as ElementId),
              )
            }
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
          >
            <option value="">— None —</option>
            {definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

interface ActionDefinitionExtrasProps {
  readonly element: ActionDefinitionElement;
}

function ActionDefinitionExtras({
  element,
}: ActionDefinitionExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const addParam = useWorkspaceStore(
    (s) => s.addActionDefinitionParameter,
  );
  const removeParam = useWorkspaceStore(
    (s) => s.removeActionDefinitionParameter,
  );

  const params = useMemo(() => {
    return elements.filter(
      (e): e is ValuePropertyElement =>
        e.kind === 'ValueProperty' &&
        e.ownerId === element.id &&
        e.ownerRole === 'parameter',
    );
  }, [elements, element.id]);

  const candidates = useMemo(() => {
    return elements.filter(
      (e): e is ValuePropertyElement =>
        e.kind === 'ValueProperty' &&
        !(e.ownerId === element.id && e.ownerRole === 'parameter'),
    );
  }, [elements, element.id]);

  const pickerId = useMemo(
    () => `inspector-action-def-add-param-${element.id}`,
    [element.id],
  );

  return (
    <div
      data-testid="inspector-action-def"
      className="flex flex-col gap-1.5"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Parameters
      </span>
      {params.length === 0 ? (
        <p
          data-testid="inspector-action-params-empty"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
        >
          No parameters yet.
        </p>
      ) : (
        <ul
          data-testid="inspector-action-param-list"
          className="flex flex-col gap-1"
        >
          {params.map((param) => (
            <li
              key={param.id}
              data-testid={`inspector-action-param-${param.id}`}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <span className="flex-1 truncate">{param.name}</span>
              <button
                type="button"
                data-testid={`inspector-action-param-remove-${param.id}`}
                aria-label={`Remove parameter ${param.name}`}
                onClick={() => removeParam(element.id, param.id)}
                className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus:outline-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <label
        htmlFor={pickerId}
        className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Add parameter
      </label>
      <select
        id={pickerId}
        data-testid="inspector-action-param-add"
        value=""
        disabled={candidates.length === 0}
        onChange={(e) => {
          const v = e.target.value;
          if (v.length === 0) return;
          addParam(element.id, v as ElementId);
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">
          {candidates.length === 0
            ? 'No value properties available'
            : '— Pick a value property —'}
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function describeStateEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el || el.kind !== 'StateUsage') return 'unknown';
  if (el.name.length > 0) return el.name;
  return `«${el.stateType}»`;
}

interface TransitionExtrasProps {
  readonly element: TransitionElement;
}

function TransitionExtras({ element }: TransitionExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setTransitionTrigger = useWorkspaceStore(
    (s) => s.setTransitionTrigger,
  );
  const setTransitionGuard = useWorkspaceStore((s) => s.setTransitionGuard);
  const setTransitionEffect = useWorkspaceStore((s) => s.setTransitionEffect);

  const sourceLabel = useMemo(
    () => describeStateEndpoint(elements, element.sourceId),
    [elements, element.sourceId],
  );
  const targetLabel = useMemo(
    () => describeStateEndpoint(elements, element.targetId),
    [elements, element.targetId],
  );

  return (
    <div
      data-testid="inspector-transition"
      data-element-id={element.id}
      className="flex flex-col gap-3"
    >
      <div
        data-testid="inspector-transition-endpoints"
        className="flex flex-col gap-1.5"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Endpoints
        </span>
        <dl className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75">
          <div className="flex gap-2">
            <dt className="font-semibold uppercase tracking-wide">Source</dt>
            <dd data-testid="inspector-transition-source">{sourceLabel}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold uppercase tracking-wide">Target</dt>
            <dd data-testid="inspector-transition-target">{targetLabel}</dd>
          </div>
        </dl>
      </div>
      <TransitionField
        element={element}
        field="trigger"
        label="Trigger"
        placeholder="e.g. doorClosed"
        testId="inspector-transition-trigger"
        onCommit={(v) => setTransitionTrigger(element.id, v)}
      />
      <TransitionField
        element={element}
        field="guard"
        label="Guard"
        placeholder="e.g. temperature > 100"
        testId="inspector-transition-guard"
        onCommit={(v) => setTransitionGuard(element.id, v)}
      />
      <TransitionField
        element={element}
        field="effect"
        label="Effect"
        placeholder="e.g. logTransition()"
        testId="inspector-transition-effect"
        onCommit={(v) => setTransitionEffect(element.id, v)}
      />
    </div>
  );
}

interface TransitionFieldProps {
  readonly element: TransitionElement;
  readonly field: 'trigger' | 'guard' | 'effect';
  readonly label: string;
  readonly placeholder: string;
  readonly testId: string;
  readonly onCommit: (value: string) => void;
}

function TransitionField({
  element,
  field,
  label,
  placeholder,
  testId,
  onCommit,
}: TransitionFieldProps): JSX.Element {
  const value = element[field] ?? '';
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(element[field] ?? '');
  }, [element, field]);
  const inputId = useMemo(
    () => `inspector-transition-${field}-${element.id}`,
    [element.id, field],
  );

  const commit = (): void => {
    if (draft === (element[field] ?? '')) return;
    onCommit(draft);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        data-testid={testId}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(element[field] ?? '');
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

interface UseCaseExtrasProps {
  readonly element: UseCaseElement;
}

function UseCaseExtras({ element }: UseCaseExtrasProps): JSX.Element {
  const setUseCaseText = useWorkspaceStore((s) => s.setUseCaseText);

  const [draft, setDraft] = useState(element.text ?? '');
  useEffect(() => {
    setDraft(element.text ?? '');
  }, [element.id, element.text]);
  const textId = useMemo(
    () => `inspector-usecase-text-${element.id}`,
    [element.id],
  );

  const commit = (): void => {
    if (draft !== (element.text ?? '')) {
      setUseCaseText(element.id, draft);
    }
  };

  return (
    <div data-testid="inspector-usecase" className="flex flex-col gap-1.5">
      <label
        htmlFor={textId}
        className="text-xs font-medium text-muted-foreground"
      >
        Text
      </label>
      <textarea
        id={textId}
        value={draft}
        data-testid="inspector-usecase-text"
        rows={4}
        placeholder="Summarise the use case scenario"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        className="resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

interface StateUsageExtrasProps {
  readonly element: StateUsageElement;
}

function StateUsageExtras({ element }: StateUsageExtrasProps): JSX.Element {
  return (
    <div data-testid="inspector-state" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          State type
        </span>
        <span
          data-testid="inspector-state-type"
          className="self-start rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80"
        >
          {element.stateType}
        </span>
      </div>
      {element.stateType === 'state' ? (
        <StateActionFields element={element} />
      ) : null}
    </div>
  );
}

interface StateActionFieldsProps {
  readonly element: StateUsageElement;
}

function StateActionFields({ element }: StateActionFieldsProps): JSX.Element {
  return (
    <>
      <StateActionField
        element={element}
        field="entryAction"
        label="Entry action"
        placeholder="e.g. turnOn()"
        testId="inspector-state-entry"
      />
      <StateActionField
        element={element}
        field="doAction"
        label="Do action"
        placeholder="e.g. monitorTemperature()"
        testId="inspector-state-do"
      />
      <StateActionField
        element={element}
        field="exitAction"
        label="Exit action"
        placeholder="e.g. turnOff()"
        testId="inspector-state-exit"
      />
    </>
  );
}

interface StateActionFieldProps {
  readonly element: StateUsageElement;
  readonly field: 'entryAction' | 'exitAction' | 'doAction';
  readonly label: string;
  readonly placeholder: string;
  readonly testId: string;
}

function StateActionField({
  element,
  field,
  label,
  placeholder,
  testId,
}: StateActionFieldProps): JSX.Element {
  const setStateEntryAction = useWorkspaceStore((s) => s.setStateEntryAction);
  const setStateExitAction = useWorkspaceStore((s) => s.setStateExitAction);
  const setStateDoAction = useWorkspaceStore((s) => s.setStateDoAction);

  const value = element[field] ?? '';
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(element[field] ?? '');
  }, [element, field]);
  const inputId = useMemo(
    () => `inspector-state-${field}-${element.id}`,
    [element.id, field],
  );

  const commit = (): void => {
    if (draft === (element[field] ?? '')) return;
    if (field === 'entryAction') setStateEntryAction(element.id, draft);
    else if (field === 'exitAction') setStateExitAction(element.id, draft);
    else setStateDoAction(element.id, draft);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        data-testid={testId}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(element[field] ?? '');
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

interface ConstraintUsageExtrasProps {
  readonly element: ConstraintUsageElement;
}

function ConstraintUsageExtras({
  element,
}: ConstraintUsageExtrasProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setConstraintExpression = useWorkspaceStore(
    (s) => s.setConstraintExpression,
  );

  const definition = useMemo(() => {
    const def = elements.find((e) => e.id === element.definitionId);
    return def && def.kind === 'ConstraintDefinition' ? def : undefined;
  }, [elements, element.definitionId]);

  const initial = definition?.expression ?? '';
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    setDraft(initial);
  }, [element.id, initial]);

  const inputId = useMemo(
    () => `inspector-constraint-expression-${element.id}`,
    [element.id],
  );

  const commit = (): void => {
    if (draft !== initial) {
      setConstraintExpression(element.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-constraint"
      className="flex flex-col gap-1.5"
    >
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-muted-foreground"
      >
        Equation
      </label>
      <textarea
        id={inputId}
        value={draft}
        data-testid="inspector-constraint-expression"
        rows={3}
        placeholder="e.g. mass = density * volume"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        className="resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

interface ValuePropertyExtrasProps {
  readonly element: ValuePropertyElement;
}

const VALUE_TYPE_OPTIONS: readonly ValueType[] = ['string', 'number', 'boolean'];

function valueLiteralToInput(value: ValueLiteral | undefined): string {
  if (value === undefined) return '';
  return String(value);
}

function parseValueLiteral(
  raw: string,
  valueType: ValueType,
): ValueLiteral | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (valueType === 'number') {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }
  if (valueType === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return undefined;
  }
  return raw;
}

function ValuePropertyExtras({
  element,
}: ValuePropertyExtrasProps): JSX.Element {
  const setValuePropertyType = useWorkspaceStore(
    (s) => s.setValuePropertyType,
  );
  const setValuePropertyDefault = useWorkspaceStore(
    (s) => s.setValuePropertyDefault,
  );

  const [draft, setDraft] = useState(valueLiteralToInput(element.defaultValue));
  useEffect(() => {
    setDraft(valueLiteralToInput(element.defaultValue));
  }, [element.id, element.defaultValue]);

  const typeId = useMemo(
    () => `inspector-value-type-${element.id}`,
    [element.id],
  );
  const defaultId = useMemo(
    () => `inspector-value-default-${element.id}`,
    [element.id],
  );

  const commitDefault = (): void => {
    const next = parseValueLiteral(draft, element.valueType);
    if (next === (element.defaultValue ?? undefined)) return;
    setValuePropertyDefault(element.id, next);
  };

  return (
    <div data-testid="inspector-value-property" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={typeId}
          className="text-xs font-medium text-muted-foreground"
        >
          Value type
        </label>
        <select
          id={typeId}
          data-testid="inspector-value-type"
          value={element.valueType}
          onChange={(e) =>
            setValuePropertyType(element.id, e.target.value as ValueType)
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        >
          {VALUE_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={defaultId}
          className="text-xs font-medium text-muted-foreground"
        >
          Default value
        </label>
        <input
          id={defaultId}
          type="text"
          value={draft}
          data-testid="inspector-value-default"
          placeholder={
            element.valueType === 'boolean' ? 'true or false' : 'optional'
          }
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDefault}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(valueLiteralToInput(element.defaultValue));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function describeParametricEndpoint(
  elements: readonly ModelElement[],
  id: ElementId,
): string {
  const el = elements.find((e) => e.id === id);
  if (!el) return 'unknown';
  if (el.kind === 'ConstraintUsage' || el.kind === 'ValueProperty') {
    return el.name.length > 0 ? el.name : `«${el.kind}»`;
  }
  return `${el.kind} · ${el.name}`;
}

interface InspectorParameterBindingEdgeProps {
  readonly edge: ParameterBindingEdge;
}

function InspectorParameterBindingEdge({
  edge,
}: InspectorParameterBindingEdgeProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const setParameterBindingLabel = useWorkspaceStore(
    (s) => s.setParameterBindingLabel,
  );

  const sourceLabel = useMemo(
    () => describeParametricEndpoint(elements, edge.sourceId),
    [elements, edge.sourceId],
  );
  const targetLabel = useMemo(
    () => describeParametricEndpoint(elements, edge.targetId),
    [elements, edge.targetId],
  );

  const [draft, setDraft] = useState(edge.label ?? '');
  useEffect(() => {
    setDraft(edge.label ?? '');
  }, [edge.id, edge.label]);
  const inputId = useMemo(
    () => `inspector-parameter-binding-label-${edge.id}`,
    [edge.id],
  );

  const commit = (): void => {
    if (draft !== (edge.label ?? '')) {
      setParameterBindingLabel(edge.id, draft);
    }
  };

  return (
    <div
      data-testid="inspector-parameter-binding-edge"
      data-edge-id={edge.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
          ParameterBinding
        </span>
        <span className="text-sm font-medium text-foreground">
          Parameter binding
        </span>
      </header>
      <dl
        data-testid="inspector-parameter-binding-endpoints"
        className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground/75"
      >
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Source</dt>
          <dd data-testid="inspector-parameter-binding-source">{sourceLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold uppercase tracking-wide">Target</dt>
          <dd data-testid="inspector-parameter-binding-target">{targetLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          Label
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          data-testid="inspector-parameter-binding-label"
          placeholder="optional parameter name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(edge.label ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}
