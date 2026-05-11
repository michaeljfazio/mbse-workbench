export type ElementId = string & { readonly __brand: 'ElementId' };

export type EdgeId = string & { readonly __brand: 'EdgeId' };

export type UserId = string & { readonly __brand: 'UserId' };

export type ProjectId = string & { readonly __brand: 'ProjectId' };

export function createElementId(): ElementId {
  return crypto.randomUUID() as ElementId;
}

export function createEdgeId(): EdgeId {
  return crypto.randomUUID() as EdgeId;
}

export function createUserId(): UserId {
  return crypto.randomUUID() as UserId;
}

export function createProjectId(): ProjectId {
  return crypto.randomUUID() as ProjectId;
}
