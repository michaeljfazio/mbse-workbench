import { useEffect, useMemo, useState } from 'react';

import type {
  ConnectionUsageElement,
  ElementId,
  ItemFlowElement,
  ModelEdge,
  ModelElement,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  PortDirection,
  PortUsageElement,
  RequirementElement,
  RequirementPriority,
  RequirementStatus,
  RequirementTraceEdge,
} from '@/model';
import { useWorkspaceStore } from '../store';

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
    return (
      <p data-testid="inspector-empty" className="text-muted-foreground">
        Select an element to edit its properties.
      </p>
    );
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
  return (
    <p data-testid="inspector-missing" className="text-muted-foreground">
      Selected element no longer exists.
    </p>
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

      <OwnerField element={element} />
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
    const portIdSet = new Set(element.portIds);
    return elements.filter(
      (e): e is PortDefinitionElement =>
        e.kind === 'PortDefinition' && portIdSet.has(e.id),
    );
  }, [elements, element.portIds]);

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
      e.kind === 'PartUsage' && e.portUsageIds.includes(portUsageId),
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
