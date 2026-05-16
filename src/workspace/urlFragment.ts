// Stable URL fragments for permalinking into the workspace.
//
// Two shapes are recognised:
//   #/element/<id>  → selects the element (and reveals it in the inspector).
//   #/diagram/<id>  → activates the diagram (opening its tab if not already).
//
// Single-selection wins over diagram in the formatter — selection is the more
// specific intent. Multi-selection has no canonical encoding; falls through
// to diagram. When neither exists the fragment is empty.

export type UrlFragment =
  | { readonly kind: 'element'; readonly id: string }
  | { readonly kind: 'diagram'; readonly id: string };

// Tolerant of either `#/element/X` (canonical) or `#element/X` (no leading
// slash). The id is URI-decoded so element/diagram ids may legitimately
// contain `%`-escaped characters.
const ELEMENT_PATTERN = /^#\/?element\/(.+)$/;
const DIAGRAM_PATTERN = /^#\/?diagram\/(.+)$/;

export function parseUrlFragment(hash: string): UrlFragment | null {
  if (hash.length === 0 || hash === '#' || hash === '#/') return null;
  const element = ELEMENT_PATTERN.exec(hash);
  if (element) {
    const raw = element[1] ?? '';
    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      return null;
    }
    return id.length === 0 ? null : { kind: 'element', id };
  }
  const diagram = DIAGRAM_PATTERN.exec(hash);
  if (diagram) {
    const raw = diagram[1] ?? '';
    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      return null;
    }
    return id.length === 0 ? null : { kind: 'diagram', id };
  }
  return null;
}

export interface FormatUrlFragmentInput {
  readonly selectedElementIds: readonly string[];
  readonly activeDiagramId: string | null;
}

export function formatUrlFragment(state: FormatUrlFragmentInput): string {
  if (state.selectedElementIds.length === 1) {
    const id = state.selectedElementIds[0]!;
    return `#/element/${encodeURIComponent(id)}`;
  }
  if (state.activeDiagramId !== null) {
    return `#/diagram/${encodeURIComponent(state.activeDiagramId)}`;
  }
  return '';
}
