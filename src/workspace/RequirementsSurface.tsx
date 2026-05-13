import { useMemo, useState } from 'react';

import type { ModelElement, RequirementElement } from '@/model';

import {
  buildRequirementRows,
  filterRequirements,
  sortRequirements,
} from './requirements/editor';
import { useWorkspaceStore } from './store';

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
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const built = buildRequirementRows(requirementsOf(elements), edges);
    const filtered = filterRequirements(built, query);
    return sortRequirements(filtered, 'reqId', 'asc');
  }, [elements, edges, query]);

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
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div
            data-testid="requirements-surface-empty"
            className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
          >
            {query.trim() === ''
              ? 'No requirements yet. Add one from the Requirements diagram.'
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
                <th scope="col" className="px-3 py-2 font-medium" title="Incoming/outgoing trace edges">Traces</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  data-testid={`requirements-surface-row-${row.id}`}
                  className="border-t border-border/50 hover:bg-accent/40"
                >
                  <td className="px-3 py-2 font-mono text-foreground">{row.reqId || '—'}</td>
                  <td className="px-3 py-2 text-foreground">{row.name}</td>
                  <td className="px-3 py-2 text-foreground">{row.priority}</td>
                  <td className="px-3 py-2 text-foreground">{row.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{truncate(row.text)}</td>
                  <td className="px-3 py-2 text-foreground tabular-nums">{row.traceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
