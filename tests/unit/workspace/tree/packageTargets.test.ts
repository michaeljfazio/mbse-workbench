import { describe, expect, it } from 'vitest';

import type { ElementId, ElementKind, ModelElement } from '@/model';
import type { OwnerRole } from '@/model/elements';
import { computePackageTargets } from '@/workspace/tree/packageTargets';

function mk<K extends ElementKind>(
  id: string,
  kind: K,
  ownerId: ElementId | null,
  name: string,
  ownerRole: OwnerRole = 'member',
): ModelElement {
  const base = {
    id: id as ElementId,
    name,
    ownerId,
    ownerRole,
    ownerIndex: 0,
    description: '',
  } as const;
  switch (kind) {
    case 'Package':
      return { ...base, kind: 'Package' } as ModelElement;
    case 'PartDefinition':
      return {
        ...base,
        kind: 'PartDefinition',
        isAbstract: false,
      } as ModelElement;
    case 'PortDefinition':
      return {
        ...base,
        kind: 'PortDefinition',
        direction: 'inout' as const,
      } as ModelElement;
    case 'ValueProperty':
      return {
        ...base,
        kind: 'ValueProperty',
        valueType: 'number',
        defaultValue: '',
      } as ModelElement;
    default:
      throw new Error(`mk: unsupported kind ${kind}`);
  }
}

describe('computePackageTargets', () => {
  it('omits self and current owner; lists remaining Packages as valid', () => {
    const root = mk('root', 'Package', null, 'root');
    const p1 = mk('p1', 'Package', 'root' as ElementId, 'Alpha');
    const p2 = mk('p2', 'Package', 'root' as ElementId, 'Beta');
    const elt = mk('e', 'PartDefinition', 'root' as ElementId, 'Pump');
    const out = computePackageTargets({
      element: elt,
      elements: [root, p1, p2, elt],
    });
    // Current owner "root" is omitted; both p1 and p2 are valid.
    expect(out.map((o) => o.id)).toEqual(['p1', 'p2']);
    expect(out.every((o) => !o.disabled)).toBe(true);
  });

  it('omits the current owner entirely', () => {
    const root = mk('root', 'Package', null, 'root');
    const elt = mk('e', 'PartDefinition', 'root' as ElementId, 'X');
    const out = computePackageTargets({
      element: elt,
      elements: [root, elt],
    });
    expect(out).toHaveLength(0);
  });

  it('flags descendant Packages as disabled with cycle reason', () => {
    const root = mk('root', 'Package', null, 'root');
    const sub = mk('sub', 'Package', 'root' as ElementId, 'Sub');
    const subSub = mk('subsub', 'Package', 'sub' as ElementId, 'SubSub');
    const out = computePackageTargets({
      element: sub,
      elements: [root, sub, subSub],
    });
    // root is omitted (current owner of sub), self is omitted, subSub is descendant → cycle.
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('subsub');
    expect(out[0]?.disabled).toBe(true);
    expect(out[0]?.disabledReason).toBe('cycle');
  });

  it('flags non-accepted kinds as disabled with kind-not-accepted reason', () => {
    const root = mk('root', 'Package', null, 'root');
    const p1 = mk('p1', 'Package', 'root' as ElementId, 'Alpha');
    // ValueProperty is NOT in acceptedChildKinds('Package').
    const vp = mk('vp', 'ValueProperty', 'root' as ElementId, 'speed');
    const out = computePackageTargets({
      element: vp,
      elements: [root, p1, vp],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('p1');
    expect(out[0]?.disabled).toBe(true);
    expect(out[0]?.disabledReason).toBe('kind-not-accepted');
  });

  it('sorts results alphabetically (case-insensitive) by label', () => {
    const root = mk('root', 'Package', null, 'root');
    const pz = mk('pz', 'Package', 'root' as ElementId, 'zebra');
    const pa = mk('pa', 'Package', 'root' as ElementId, 'Apple');
    const pm = mk('pm', 'Package', 'root' as ElementId, 'mango');
    const elt = mk('e', 'PartDefinition', 'root' as ElementId, 'Pump');
    const out = computePackageTargets({
      element: elt,
      elements: [root, pz, pa, pm, elt],
    });
    expect(out.map((o) => o.label)).toEqual(['Apple', 'mango', 'zebra']);
  });

  it('returns empty array when no Packages exist beyond current owner', () => {
    const root = mk('root', 'Package', null, 'root');
    const elt = mk('e', 'PartDefinition', 'root' as ElementId, 'X');
    const out = computePackageTargets({
      element: elt,
      elements: [root, elt],
    });
    expect(out).toEqual([]);
  });

  it('does not include the element itself when it is a Package', () => {
    const root = mk('root', 'Package', null, 'root');
    const me = mk('me', 'Package', 'root' as ElementId, 'Me');
    const sib = mk('sib', 'Package', 'root' as ElementId, 'Sib');
    const out = computePackageTargets({
      element: me,
      elements: [root, me, sib],
    });
    // root is omitted (current owner); me is omitted (self); sib is valid.
    expect(out.map((o) => o.id)).toEqual(['sib']);
    expect(out[0]?.disabled).toBe(false);
  });
});
