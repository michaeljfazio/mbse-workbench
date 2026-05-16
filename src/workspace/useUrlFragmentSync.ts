import { useEffect, useState } from 'react';

import type { ElementId } from '@/model';

import type { DiagramId } from './diagram';
import { useWorkspaceStore } from './store';
import { formatUrlFragment, parseUrlFragment } from './urlFragment';

// Apply the current URL hash to the store. Validates ids against the loaded
// project; unknown ids are ignored (the URL is left as-is — the user typed
// or pasted something we can't resolve, and clobbering it would be worse).
function applyHashToStore(hash: string): void {
  const fragment = parseUrlFragment(hash);
  if (!fragment) return;
  const state = useWorkspaceStore.getState();
  if (!state.initialized || !state.registry) return;

  if (fragment.kind === 'element') {
    const id = fragment.id as ElementId;
    if (!state.registry.get(id)) return;
    if (
      state.selectedElementIds.length === 1 &&
      state.selectedElementIds[0] === id
    ) {
      return;
    }
    state.setSelection([id]);
    return;
  }

  const id = fragment.id as DiagramId;
  if (!state.diagrams.some((d) => d.id === id)) return;
  if (state.activeDiagramId === id) return;
  state.openDiagram(id);
}

function writeHash(next: string): void {
  if (typeof window === 'undefined') return;
  const current = window.location.hash;
  if (next === current) return;
  // Treat empty / `#` as equivalent — avoid spamming replaceState when the
  // canonical form for "no fragment" toggles between the two.
  if (next === '' && (current === '' || current === '#')) return;
  const url = `${window.location.pathname}${window.location.search}${next}`;
  window.history.replaceState(null, '', url || window.location.pathname);
}

// Bidirectional sync between `window.location.hash` and the workspace store's
// selection / active-diagram slots.
//
// On mount (after bootstrap completes) the URL hash is parsed and dispatched
// to the store. After hydration, store changes are written back as
// `replaceState` (no history-stack entries — permalinks, not navigation).
// `hashchange` events from back/forward navigation re-apply the URL.
export function useUrlFragmentSync(): void {
  const initialized = useWorkspaceStore((s) => s.initialized);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const [hydrated, setHydrated] = useState(false);

  // URL → store on initial bootstrap, and again on any back/forward hash
  // change. The hashchange listener is only meaningful once the store is
  // initialized — we guard inside `applyHashToStore`.
  useEffect(() => {
    if (!initialized) return;
    if (typeof window === 'undefined') return;
    applyHashToStore(window.location.hash);
    setHydrated(true);
    function onHashChange(): void {
      applyHashToStore(window.location.hash);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [initialized]);

  // Store → URL once hydration completes. Skipping the pre-hydration window
  // prevents the very first render's empty selection from clobbering an
  // inbound `#/element/<id>` fragment before `applyHashToStore` runs.
  useEffect(() => {
    if (!hydrated) return;
    const next = formatUrlFragment({
      selectedElementIds: selectedElementIds as readonly string[],
      activeDiagramId: activeDiagramId as string | null,
    });
    writeHash(next);
  }, [hydrated, selectedElementIds, activeDiagramId]);
}
