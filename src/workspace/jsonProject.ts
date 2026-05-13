import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository/types';

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
  const history =
    obj.history &&
    typeof obj.history === 'object' &&
    Array.isArray((obj.history as { undo?: unknown }).undo) &&
    Array.isArray((obj.history as { redo?: unknown }).redo)
      ? (obj.history as Project['history'])
      : EMPTY_COMMAND_HISTORY;
  const conversations = Array.isArray(obj.conversations) ? obj.conversations : [];
  const project: Project = {
    id: obj.id as Project['id'],
    name: obj.name,
    createdAt: obj.createdAt,
    modifiedAt: obj.modifiedAt,
    elements: obj.elements as Project['elements'],
    edges: obj.edges as Project['edges'],
    diagrams: obj.diagrams as Project['diagrams'],
    history,
    conversations: conversations as Project['conversations'],
  };
  return { ok: true, project };
}
