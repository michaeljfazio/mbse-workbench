import { describe, expect, it } from 'vitest';
import { createElementId, createUserId } from '@/model';
import { allowAll, can, type PermissionAction } from '../permissions';
import { createSessionUser } from '../user';

describe('allowAll', () => {
  it('returns true for every action and target', () => {
    const user = createSessionUser();
    const actions: PermissionAction[] = [
      'create',
      'update',
      'delete',
      'link',
      'unlink',
    ];
    for (const action of actions) {
      expect(allowAll(user, action, undefined)).toBe(true);
      expect(
        allowAll(user, action, {
          id: createElementId(),
          kind: 'PartDefinition',
          name: 'X',
          isAbstract: false,
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        }),
      ).toBe(true);
    }
  });
});

describe('can (default single-user hook)', () => {
  it('returns true in single-user mode', () => {
    const user = createSessionUser();
    expect(can(user, 'create', undefined)).toBe(true);
    expect(can(user, 'delete', undefined)).toBe(true);
  });

  it('returns false when the element has an ownerUserId that is not the actor', () => {
    const owner = createUserId();
    const actor = createSessionUser();
    expect(
      can(actor, 'update', {
        id: createElementId(),
        kind: 'PartDefinition',
        name: 'Owned',
        isAbstract: false,
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
        ownerUserId: owner,
      }),
    ).toBe(false);
  });

  it('returns true when the element has an ownerUserId that matches the actor', () => {
    const actor = createSessionUser();
    expect(
      can(actor, 'update', {
        id: createElementId(),
        kind: 'PartDefinition',
        name: 'Mine',
        isAbstract: false,
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
        ownerUserId: actor.id,
      }),
    ).toBe(true);
  });
});
