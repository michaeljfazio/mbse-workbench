import { useMemo, useState } from 'react';

import type {
  ModelElement,
  RequirementElement,
  RequirementPriority,
  RequirementStatus,
} from '@/model';
import { REQUIREMENTS_VIEWPOINT_ID } from '@/viewpoints';

import {
  buildRequirementRows,
  filterRequirements,
  sortRequirements,
} from './requirements/editor';
import { useWorkspaceStore } from './store';

const PRIORITIES: readonly RequirementPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const STATUSES: readonly RequirementStatus[] = [
  'draft',
  'approved',
  'implemented',
  'verified',
  'rejected',
];

function requirementsOf(
  elements: readonly ModelElement[],
): readonly RequirementElement[] {
  return elements.filter(
    (e): e is RequirementElement => e.kind === 'Requirement',
  );
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function RequirementsSurface(): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const edges = useWorkspaceStore((s) => s.edges);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const createRequirement = useWorkspaceStore((s) => s.createRequirement);
  const deleteElement = useWorkspaceStore((s) => s.deleteElement);
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const setRequirementReqId = useWorkspaceStore((s) => s.setRequirementReqId);
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

  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const built = buildRequirementRows(requirementsOf(elements), edges);
    const filtered = filterRequirements(built, query);
    return sortRequirements(filtered, 'reqId', 'asc');
  }, [elements, edges, query]);

  const requirementsDiagramId =
    diagrams.find((d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID)?.id ??
    null;
  const canAdd = requirementsDiagramId !== null;

  const selectedId = selectedElementIds[0] ?? null;
  const selected = useMemo<RequirementElement | null>(() => {
    if (selectedId === null) return null;
    const found = elements.find((e) => e.id === selectedId);
    return found && found.kind === 'Requirement' ? found : null;
  }, [elements, selectedId]);

  const handleAdd = (): void => {
    if (!requirementsDiagramId) return;
    const id = createRequirement(requirementsDiagramId, { x: 0, y: 0 });
    if (id) setSelection([id]);
  };

  const handleDelete = (): void => {
    if (!selected) return;
    deleteElement(selected.id);
    setSelection([]);
  };

  return (
    <section
      data-testid="requirements-surface"
      id="requirements-surface-panel"
      role="tabpanel"
      aria-labelledby="surface-tab-requirements"
      aria-label="Requirements editor"
      className="flex min-h-0 flex-1 flex-col bg-background"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2">
        <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
          <span>Filter</span>
          <input
            type="search"
            data-testid="requirements-surface-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reqId, name, or text"
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
        </label>
        <span
          data-testid="requirements-surface-count"
          className="text-xs text-muted-foreground"
        >
          {rows.length} requirement{rows.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          data-testid="requirements-surface-add"
          onClick={handleAdd}
          disabled={!canAdd}
          title={
            canAdd
              ? 'Add a new requirement'
              : 'Create a Requirements diagram first'
          }
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Requirement
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div
              data-testid="requirements-surface-empty"
              className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
            >
              {query.trim() === ''
                ? 'No requirements yet. Add one with the button above.'
                : 'No requirements match the current filter.'}
            </div>
          ) : (
            <table
              data-testid="requirements-surface-table"
              className="w-full text-left text-xs"
            >
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">reqId</th>
                  <th scope="col" className="px-3 py-2 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2 font-medium">Priority</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Text</th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium"
                    title="Incoming/outgoing trace edges"
                  >
                    Traces
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = row.id === selectedId;
                  return (
                    <tr
                      key={row.id}
                      data-testid={`requirements-surface-row-${row.id}`}
                      aria-selected={isSelected}
                      onClick={() => setSelection([row.id])}
                      className={`cursor-pointer border-t border-border/50 ${
                        isSelected ? 'bg-accent' : 'hover:bg-accent/40'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-foreground">
                        {row.reqId || '—'}
                      </td>
                      <td className="px-3 py-2 text-foreground">{row.name}</td>
                      <td className="px-3 py-2 text-foreground">
                        {row.priority}
                      </td>
                      <td className="px-3 py-2 text-foreground">{row.status}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {truncate(row.text)}
                      </td>
                      <td className="px-3 py-2 text-foreground tabular-nums">
                        {row.traceCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected ? (
          <RequirementEditorForm
            key={selected.id}
            requirement={selected}
            onRename={(value) => renameElement(selected.id, value)}
            onReqIdChange={(value) => setRequirementReqId(selected.id, value)}
            onTextChange={(value) => setRequirementText(selected.id, value)}
            onPriorityChange={(value) =>
              setRequirementPriority(selected.id, value)
            }
            onStatusChange={(value) =>
              setRequirementStatus(selected.id, value)
            }
            onRationaleChange={(value) =>
              setRequirementRationale(selected.id, value)
            }
            onDelete={handleDelete}
          />
        ) : null}
      </div>
    </section>
  );
}

interface RequirementEditorFormProps {
  readonly requirement: RequirementElement;
  readonly onRename: (value: string) => void;
  readonly onReqIdChange: (value: string) => void;
  readonly onTextChange: (value: string) => void;
  readonly onPriorityChange: (value: RequirementPriority) => void;
  readonly onStatusChange: (value: RequirementStatus) => void;
  readonly onRationaleChange: (value: string) => void;
  readonly onDelete: () => void;
}

function RequirementEditorForm(props: RequirementEditorFormProps): JSX.Element {
  const { requirement, onDelete } = props;
  return (
    <aside
      data-testid="requirements-surface-form"
      aria-label="Edit requirement"
      className="flex w-80 min-w-0 shrink-0 flex-col gap-3 overflow-auto border-l border-border bg-card p-3 text-xs"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Edit requirement
        </h2>
        <button
          type="button"
          data-testid="requirements-surface-delete"
          onClick={onDelete}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/20"
        >
          Delete
        </button>
      </div>
      <Field label="reqId">
        <input
          type="text"
          data-testid="requirements-form-reqId"
          value={requirement.reqId ?? ''}
          onChange={(e) => props.onReqIdChange(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-foreground outline-none focus:border-primary"
        />
      </Field>
      <Field label="Name">
        <input
          type="text"
          data-testid="requirements-form-name"
          value={requirement.name}
          onChange={(e) => props.onRename(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
        />
      </Field>
      <Field label="Priority">
        <select
          data-testid="requirements-form-priority"
          value={requirement.priority}
          onChange={(e) =>
            props.onPriorityChange(e.target.value as RequirementPriority)
          }
          className="w-full rounded border border-input bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select
          data-testid="requirements-form-status"
          value={requirement.status}
          onChange={(e) =>
            props.onStatusChange(e.target.value as RequirementStatus)
          }
          className="w-full rounded border border-input bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Text">
        <textarea
          data-testid="requirements-form-text"
          value={requirement.text}
          onChange={(e) => props.onTextChange(e.target.value)}
          rows={4}
          className="w-full resize-y rounded border border-input bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
        />
      </Field>
      <Field label="Rationale">
        <textarea
          data-testid="requirements-form-rationale"
          value={requirement.rationale ?? ''}
          onChange={(e) => props.onRationaleChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded border border-input bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
        />
      </Field>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-muted-foreground">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
