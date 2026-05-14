import { migrateLegacyProject } from '@/repository/migrate';
import type { Project } from '@/repository/types';

export type ParseProjectJsonResult =
  | { readonly ok: true; readonly project: Project }
  | { readonly ok: false; readonly message: string };

export function serializeProjectJson(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`;
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
  // Delegate root synthesis + legacy schema migration to the shared codemod.
  try {
    return { ok: true, project: migrateLegacyProject(obj) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'invalid project';
    return { ok: false, message: detail };
  }
}
