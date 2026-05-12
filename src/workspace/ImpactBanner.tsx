import { useMemo } from 'react';

import type { ElementId } from '@/model';

import { useWorkspaceStore } from './store';

export function ImpactBanner(): JSX.Element | null {
  const impactRootId = useWorkspaceStore((s) => s.impactRootId);
  const impactHighlightedIds = useWorkspaceStore((s) => s.impactHighlightedIds);
  const registry = useWorkspaceStore((s) => s.registry);
  const clearImpactHighlight = useWorkspaceStore((s) => s.clearImpactHighlight);

  const rootName = useMemo(() => {
    if (!impactRootId || !registry) return null;
    const el = registry.get(impactRootId as ElementId);
    if (!el) return null;
    return 'name' in el ? el.name : null;
  }, [impactRootId, registry]);

  if (!impactRootId) return null;

  const count = impactHighlightedIds.size;

  return (
    <div
      data-testid="impact-banner"
      role="status"
      aria-live="polite"
      className="flex h-8 shrink-0 items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-3 text-xs text-amber-900"
    >
      <span data-testid="impact-banner-label">
        Impact: <span className="font-semibold">{rootName ?? 'unknown'}</span>
        <span className="ml-2 text-amber-700"> {count} element{count === 1 ? '' : 's'}</span>
      </span>
      <button
        type="button"
        data-testid="impact-banner-clear"
        onClick={clearImpactHighlight}
        className="rounded border border-amber-400 bg-white px-2 py-0.5 font-medium text-amber-900 transition hover:bg-amber-100"
      >
        Clear
      </button>
    </div>
  );
}
