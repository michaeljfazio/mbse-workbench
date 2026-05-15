import {
  createElementId,
  type ElementId,
  type ModelElement,
  type OwnerRole,
  type PackageElement,
} from '@/model';
import { EMPTY_COMMAND_HISTORY, type Project } from './types';

/**
 * Codemod that migrates a raw persisted project (or freshly-parsed JSON
 * blob) onto the post-ADR-0011 element schema:
 *
 *  - every element carries `ownerId` / `ownerRole` / `ownerIndex`
 *  - no element carries parent-side child arrays (`memberIds`,
 *    `propertyIds`, `portIds`, `portUsageIds`, `parameterIds`,
 *    `portDefinitionIds`)
 *  - the project has an explicit root `Package` with `ownerId === null`
 *    referenced by `project.rootId`
 *
 * Legacy persisted blobs lack any of these. This function reads the
 * legacy parent-side arrays, assigns containment via `ownerId`/role/index
 * on the children, strips the arrays, and synthesizes a root Package if
 * none exists. Already-migrated blobs round-trip unchanged.
 */

type LegacyArrayField =
  | 'memberIds'
  | 'propertyIds'
  | 'portIds'
  | 'portUsageIds'
  | 'parameterIds'
  | 'portDefinitionIds';

const LEGACY_FIELDS_BY_KIND: Partial<
  Record<ModelElement['kind'], readonly { field: LegacyArrayField; role: OwnerRole }[]>
> = {
  Package: [{ field: 'memberIds', role: 'member' }],
  PartDefinition: [
    { field: 'propertyIds', role: 'property' },
    { field: 'portIds', role: 'port' },
  ],
  PartUsage: [{ field: 'portUsageIds', role: 'port' }],
  ActionDefinition: [{ field: 'parameterIds', role: 'parameter' }],
  ConstraintDefinition: [{ field: 'parameterIds', role: 'parameter' }],
  InterfaceDefinition: [{ field: 'portDefinitionIds', role: 'portDefinition' }],
};

const ALL_LEGACY_FIELDS: readonly LegacyArrayField[] = [
  'memberIds',
  'propertyIds',
  'portIds',
  'portUsageIds',
  'parameterIds',
  'portDefinitionIds',
];

interface OwnerAssignment {
  readonly ownerId: ElementId | null;
  readonly ownerRole: OwnerRole;
  readonly ownerIndex: number;
}

function stripLegacyFields(
  el: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(el)) {
    if ((ALL_LEGACY_FIELDS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}

function isElementRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { kind?: unknown }).kind === 'string'
  );
}

interface MigratedShape {
  readonly rootId: ElementId;
  readonly elements: readonly ModelElement[];
}

function migrateElementsAndRoot(
  rawElements: readonly unknown[],
  projectName: string,
  existingRootId: string | undefined,
): MigratedShape {
  const rawRecords: Record<string, unknown>[] = rawElements
    .filter(isElementRecord)
    .map((r) => ({ ...r }));

  const byId = new Map<string, Record<string, unknown>>();
  for (const r of rawRecords) {
    byId.set(r.id as string, r);
  }

  // Pass 1: derive ownerId/role/index from legacy parent-side arrays.
  const assignments = new Map<string, OwnerAssignment>();
  for (const parent of rawRecords) {
    const kind = parent.kind as ModelElement['kind'];
    const fields = LEGACY_FIELDS_BY_KIND[kind];
    if (!fields) continue;
    for (const { field, role } of fields) {
      const arr = parent[field];
      if (!Array.isArray(arr)) continue;
      arr.forEach((childId, index) => {
        if (typeof childId !== 'string') return;
        if (assignments.has(childId)) return;
        assignments.set(childId, {
          ownerId: parent.id as ElementId,
          ownerRole: role,
          ownerIndex: index,
        });
      });
    }
  }

  // Pass 2: locate or synthesize the root Package.
  // Priority: explicit project.rootId → element with ownerId===null kind===Package
  //           → first Package with no assignment → synthesize new.
  let rootId: ElementId | undefined;
  if (existingRootId && byId.has(existingRootId)) {
    rootId = existingRootId as ElementId;
  } else {
    const explicitRoot = rawRecords.find(
      (r) =>
        r.kind === 'Package' &&
        (r.ownerId === null ||
          (r.ownerId === undefined && !assignments.has(r.id as string))),
    );
    if (explicitRoot) {
      rootId = explicitRoot.id as ElementId;
    }
  }

  // Pass 3: collect unassigned, non-root elements and reparent them under root.
  const unassignedNonRoot: Record<string, unknown>[] = [];
  for (const r of rawRecords) {
    if (r.id === rootId) continue;
    if (assignments.has(r.id as string)) continue;
    // Preserve an already-migrated ownerId if it points at a known element.
    if (typeof r.ownerId === 'string' && byId.has(r.ownerId)) {
      assignments.set(r.id as string, {
        ownerId: r.ownerId as ElementId,
        ownerRole:
          typeof r.ownerRole === 'string'
            ? (r.ownerRole as OwnerRole)
            : 'member',
        ownerIndex:
          typeof r.ownerIndex === 'number' ? r.ownerIndex : 0,
      });
      continue;
    }
    unassignedNonRoot.push(r);
  }

  // Synthesize root if needed.
  let elements: ModelElement[];
  if (rootId === undefined) {
    const synthesizedRoot: PackageElement = {
      id: createElementId(),
      kind: 'Package',
      name: projectName,
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    rootId = synthesizedRoot.id;
    elements = [synthesizedRoot];
  } else {
    elements = [];
  }

  // Assign unassigned elements as members under root, in their original order.
  unassignedNonRoot.forEach((r, index) => {
    assignments.set(r.id as string, {
      ownerId: rootId as ElementId,
      ownerRole: 'member',
      ownerIndex: index,
    });
  });

  // Pass 4: emit migrated elements.
  for (const r of rawRecords) {
    const stripped = stripLegacyFields(r);
    if (r.id === rootId) {
      const rootEl: Record<string, unknown> = {
        ...stripped,
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
      };
      elements.push(rootEl as unknown as ModelElement);
      continue;
    }
    const assigned = assignments.get(r.id as string);
    // assigned must exist by construction (unassigned was pushed into the map).
    if (!assigned) continue;
    const migrated: Record<string, unknown> = {
      ...stripped,
      ownerId: assigned.ownerId,
      ownerRole: assigned.ownerRole,
      ownerIndex: assigned.ownerIndex,
    };
    elements.push(migrated as unknown as ModelElement);
  }

  return { rootId, elements };
}

/**
 * Migrate a raw persisted project payload onto the current schema.
 * Throws if `raw` is not a recognizable project-shaped object.
 */
export function migrateLegacyProject(raw: unknown): Project {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('project payload is not an object');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    throw new Error('project.id must be a non-empty string');
  }
  const name = typeof obj.name === 'string' ? obj.name : (obj.id as string);
  const rawElements = Array.isArray(obj.elements) ? obj.elements : [];
  const { rootId, elements } = migrateElementsAndRoot(
    rawElements,
    name,
    typeof obj.rootId === 'string' && obj.rootId.length > 0
      ? obj.rootId
      : undefined,
  );

  // Migrate diagrams: every diagram must carry a non-optional `context` per
  // ADR 0011 / JOURNAL iter-531. Context-less legacy diagrams default to
  // `{ kind: 'package', id: rootId }`. Pre-existing valid contexts (which
  // already carry a `kind` discriminator) round-trip unchanged.
  const rawDiagrams = Array.isArray(obj.diagrams) ? obj.diagrams : [];
  const diagrams = rawDiagrams.map((d) => {
    if (d === null || typeof d !== 'object') return d;
    const dr = d as Record<string, unknown>;
    if (dr.context && typeof dr.context === 'object') return dr;
    return { ...dr, context: { kind: 'package', id: rootId } };
  });
  const edges = Array.isArray(obj.edges) ? obj.edges : [];
  const history =
    obj.history &&
    typeof obj.history === 'object' &&
    Array.isArray((obj.history as { undo?: unknown }).undo) &&
    Array.isArray((obj.history as { redo?: unknown }).redo)
      ? (obj.history as Project['history'])
      : EMPTY_COMMAND_HISTORY;
  const conversations = Array.isArray(obj.conversations)
    ? (obj.conversations as Project['conversations'])
    : [];

  return {
    id: obj.id as Project['id'],
    name,
    createdAt:
      typeof obj.createdAt === 'string'
        ? obj.createdAt
        : new Date(0).toISOString(),
    modifiedAt:
      typeof obj.modifiedAt === 'string'
        ? obj.modifiedAt
        : new Date(0).toISOString(),
    rootId,
    elements,
    edges: edges as Project['edges'],
    diagrams: diagrams as Project['diagrams'],
    history,
    conversations,
  };
}
