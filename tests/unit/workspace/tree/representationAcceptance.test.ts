import { describe, expect, it } from 'vitest';

import { ELEMENT_KINDS } from '@/model';
import { acceptedRepresentations } from '@/workspace/tree/representationAcceptance';

describe('acceptedRepresentations', () => {
  it('Package accepts BDD, Requirements, Use Case, Package as native entries (all with context kind "package")', () => {
    const opts = acceptedRepresentations('Package').filter(
      (o) =>
        o.implicitOwnerKind === undefined &&
        o.implicitOwnerPromptKinds === undefined,
    );
    expect(opts.map((o) => o.viewpointId)).toEqual([
      'bdd',
      'requirements',
      'use-case',
      'package',
    ]);
    for (const o of opts) expect(o.contextKind).toBe('package');
  });

  it('Package additionally exposes Activity / State Machine / IBD with implicit-owner creation (ADR 0014)', () => {
    const implicit = acceptedRepresentations('Package').filter(
      (o) => o.implicitOwnerKind !== undefined,
    );
    expect(
      implicit.map((o) => ({
        viewpointId: o.viewpointId,
        contextKind: o.contextKind,
        implicitOwnerKind: o.implicitOwnerKind,
      })),
    ).toEqual([
      { viewpointId: 'ibd', contextKind: 'partDefinition', implicitOwnerKind: 'PartDefinition' },
      { viewpointId: 'activity', contextKind: 'actionDefinition', implicitOwnerKind: 'ActionDefinition' },
      {
        viewpointId: 'state-machine',
        contextKind: 'stateDefinition',
        implicitOwnerKind: 'StateDefinition',
      },
    ]);
  });

  it('Package additionally exposes Parametric with an implicit-owner-kind prompt (ADR 0014)', () => {
    const prompt = acceptedRepresentations('Package').filter(
      (o) => o.implicitOwnerPromptKinds !== undefined,
    );
    expect(prompt).toHaveLength(1);
    expect(prompt[0]?.viewpointId).toBe('parametric');
    expect(prompt[0]?.contextKind).toBe('partDefinition');
    expect(prompt[0]?.implicitOwnerPromptKinds).toEqual(['PartDefinition']);
  });

  it('PartDefinition accepts BDD, IBD, Parametric (all with context kind "partDefinition")', () => {
    const opts = acceptedRepresentations('PartDefinition');
    expect(opts.map((o) => o.viewpointId)).toEqual([
      'bdd',
      'ibd',
      'parametric',
    ]);
    for (const o of opts) expect(o.contextKind).toBe('partDefinition');
  });

  it('ActionDefinition accepts Activity', () => {
    expect(acceptedRepresentations('ActionDefinition')).toEqual([
      { viewpointId: 'activity', contextKind: 'actionDefinition', label: 'Activity' },
    ]);
  });

  it('StateDefinition accepts State Machine', () => {
    expect(acceptedRepresentations('StateDefinition')).toEqual([
      {
        viewpointId: 'state-machine',
        contextKind: 'stateDefinition',
        label: 'State Machine',
      },
    ]);
  });

  it('returns an empty list for kinds with no diagram-host context kind', () => {
    const noRepresentation = ELEMENT_KINDS.filter(
      (k) =>
        k !== 'Package' &&
        k !== 'PartDefinition' &&
        k !== 'ActionDefinition' &&
        k !== 'StateDefinition',
    );
    for (const k of noRepresentation) {
      expect(acceptedRepresentations(k)).toEqual([]);
    }
  });

  it('returns label-prefixed strings suitable for default diagram names', () => {
    for (const o of acceptedRepresentations('PartDefinition')) {
      expect(o.label.length).toBeGreaterThan(0);
    }
  });
});
