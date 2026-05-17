/**
 * Closes #413 (proof half): exercises the `create-diagram` / `delete-diagram`
 * commands against the bus directly. The store-level wiring is covered by the
 * existing unit tests around `createDiagram` / `deleteDiagram` (which now go
 * through the bus) and by the e2e in
 * `tests/e2e/package-row-implicit-owner.spec.ts`.
 */

import { describe, expect, it } from 'vitest';
import {
  createElementRegistry,
  createUserId,
  type PartDefinitionElement,
} from '@/model';
import {
  createCommandBus,
  createInMemoryDiagramStore,
  type Command,
  type CreateDiagramCommand,
  type DeleteDiagramCommand,
} from '@/commands';
import type { User } from '@/collab';
import {
  createDiagramId,
  type Diagram,
  type DiagramId,
} from '@/workspace/diagram';

function mkUser(): User {
  return { id: createUserId(), displayName: 'alice', color: '#000000' };
}

function mkDiagram(name = 'A', id?: DiagramId): Diagram {
  return {
    id: id ?? createDiagramId(),
    viewpointId: 'bdd',
    name,
    positions: {},
    context: { kind: 'package', id: 'pkg-1' as PartDefinitionElement['id'] },
  };
}

describe('command bus — create-diagram / delete-diagram (#413)', () => {
  it('create-diagram adds the diagram to the store; inverse removes it', () => {
    const registry = createElementRegistry();
    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();
    const diagram = mkDiagram('Sales');

    const event = bus.dispatch(
      { kind: 'create-diagram', diagram } satisfies CreateDiagramCommand,
      user,
    );

    expect(diagrams.list()).toEqual([diagram]);
    expect(event.payload).toEqual({
      kind: 'delete-diagram',
      id: diagram.id,
    } satisfies DeleteDiagramCommand);

    // Undo: diagram is gone again.
    bus.undo();
    expect(diagrams.list()).toEqual([]);

    // Redo: diagram is back.
    bus.redo();
    expect(diagrams.list()).toEqual([diagram]);
  });

  it('delete-diagram removes the diagram; inverse restores it verbatim', () => {
    const registry = createElementRegistry();
    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();
    const diagram = mkDiagram('Engineering');
    diagrams.addDiagram(diagram); // seed (not through bus, so not on stack)

    const event = bus.dispatch(
      { kind: 'delete-diagram', id: diagram.id } satisfies DeleteDiagramCommand,
      user,
    );

    expect(diagrams.list()).toEqual([]);
    // The inverse must carry the full Diagram object so undo can rebuild it.
    expect(event.payload).toEqual({
      kind: 'create-diagram',
      diagram,
    } satisfies CreateDiagramCommand);

    bus.undo();
    expect(diagrams.list()).toEqual([diagram]);
  });

  it('delete-diagram clears activeDiagramId when it points at the removed diagram', () => {
    const registry = createElementRegistry();
    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();
    const a = mkDiagram('A');
    const b = mkDiagram('B');
    diagrams.addDiagram(a);
    diagrams.addDiagram(b);
    diagrams.activeDiagramId = a.id;

    bus.dispatch({ kind: 'delete-diagram', id: a.id }, user);

    // Active pointer was cleared (the in-memory store doesn't reassign it;
    // that's the workspace store's responsibility). The bus-side contract:
    // active is no longer the removed id.
    expect(diagrams.activeDiagramId).not.toBe(a.id);
    expect(diagrams.list()).toEqual([b]);
  });

  it('delete-diagram leaves activeDiagramId untouched when it points elsewhere', () => {
    const registry = createElementRegistry();
    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();
    const a = mkDiagram('A');
    const b = mkDiagram('B');
    diagrams.addDiagram(a);
    diagrams.addDiagram(b);
    diagrams.activeDiagramId = b.id;

    bus.dispatch({ kind: 'delete-diagram', id: a.id }, user);

    expect(diagrams.activeDiagramId).toBe(b.id);
  });

  it('compound { create-element, create-diagram } undoes both atomically', () => {
    // The implicit-owner-creation flow's whole point per ADR 0014 / #413.
    const registry = createElementRegistry();
    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();

    const owner: PartDefinitionElement = {
      id: 'owner-1' as PartDefinitionElement['id'],
      kind: 'PartDefinition',
      name: 'Owner',
      isAbstract: false,
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    const diagram = mkDiagram('Owner Activity');

    const compound: Command = {
      kind: 'compound',
      commands: [
        { kind: 'create-element', element: owner },
        { kind: 'create-diagram', diagram },
      ],
    };
    bus.dispatch(compound, user);

    expect(registry.get(owner.id)).toEqual(owner);
    expect(diagrams.list()).toEqual([diagram]);

    // One undo reverses BOTH — that's the whole point of compound. No orphan
    // diagram is left behind pointing at a deleted owner.
    bus.undo();
    expect(registry.get(owner.id)).toBeUndefined();
    expect(diagrams.list()).toEqual([]);

    // Redo brings both back atomically.
    bus.redo();
    expect(registry.get(owner.id)).toEqual(owner);
    expect(diagrams.list()).toEqual([diagram]);
  });

  it('throws when dispatched without a DiagramStore wired in', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry }); // no diagrams: option
    const user = mkUser();

    expect(() =>
      bus.dispatch({ kind: 'create-diagram', diagram: mkDiagram() }, user),
    ).toThrow(/create-diagram dispatched without a DiagramStore/);

    expect(() =>
      bus.dispatch({ kind: 'delete-diagram', id: createDiagramId() }, user),
    ).toThrow(/delete-diagram dispatched without a DiagramStore/);
  });
});
