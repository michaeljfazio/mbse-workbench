import { applyStandardLibrary, stripStandardLibrary } from '@/library';
import { migrateLegacyProject } from '@/repository/migrate';
import type { Project } from '@/repository/types';

export type ParseProjectJsonResult =
  | { readonly ok: true; readonly project: Project }
  | { readonly ok: false; readonly message: string };

export function serializeProjectJson(project: Project): string {
  // Mirror the repository.save() boundary: exported JSON is user content
  // only. Library content is re-merged on import via applyStandardLibrary,
  // and including it would bloat the file with deterministically-derivable
  // bytes.
  const userOnly = stripStandardLibrary(project);
  return `${JSON.stringify(userOnly, null, 2)}\n`;
}

export function parseProjectJson(text: string): ParseProjectJsonResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'invalid JSON';
    return { ok: false, message: `invalid JSON: ${detail}` };
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'project must be a JSON object' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    return { ok: false, message: 'project.id must be a non-empty string' };
  }
  if (typeof obj.name !== 'string') {
    return { ok: false, message: 'project.name must be a string' };
  }
  if (typeof obj.createdAt !== 'string' || typeof obj.modifiedAt !== 'string') {
    return { ok: false, message: 'project timestamps must be ISO strings' };
  }
  if (!Array.isArray(obj.elements)) {
    return { ok: false, message: 'project.elements must be an array' };
  }
  if (!Array.isArray(obj.edges)) {
    return { ok: false, message: 'project.edges must be an array' };
  }
  if (!Array.isArray(obj.diagrams) || obj.diagrams.length === 0) {
    return { ok: false, message: 'project.diagrams must be a non-empty array' };
  }
  // Delegate root synthesis + legacy schema migration to the shared codemod,
  // then re-merge the standard library so the imported in-memory project has
  // the same library shape as a `load()`-ed project.
  try {
    return { ok: true, project: applyStandardLibrary(migrateLegacyProject(obj)) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'invalid project';
    return { ok: false, message: detail };
  }
}
