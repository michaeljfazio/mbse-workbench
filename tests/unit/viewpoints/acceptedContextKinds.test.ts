import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_VIEWPOINT_ID,
  activityViewpoint,
  BDD_VIEWPOINT_ID,
  bddViewpoint,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  PACKAGE_VIEWPOINT_ID,
  packageViewpoint,
  PARAMETRIC_VIEWPOINT_ID,
  parametricViewpoint,
  REQUIREMENTS_VIEWPOINT_ID,
  requirementsViewpoint,
  STATE_MACHINE_VIEWPOINT_ID,
  stateMachineViewpoint,
  USE_CASE_VIEWPOINT_ID,
  useCaseViewpoint,
  type Viewpoint,
} from '@/viewpoints';

// Locked per JOURNAL iter-531 / ADR 0011. Changing this table requires a new
// JOURNAL entry — these tests are the gate.
const EXPECTED: Record<string, readonly string[]> = {
  [BDD_VIEWPOINT_ID]: ['package', 'partDefinition'],
  [IBD_VIEWPOINT_ID]: ['partDefinition'],
  [REQUIREMENTS_VIEWPOINT_ID]: ['package'],
  [ACTIVITY_VIEWPOINT_ID]: ['actionDefinition'],
  [STATE_MACHINE_VIEWPOINT_ID]: ['stateDefinition'],
  [USE_CASE_VIEWPOINT_ID]: ['package'],
  [PARAMETRIC_VIEWPOINT_ID]: ['partDefinition'],
  [PACKAGE_VIEWPOINT_ID]: ['package'],
};

const ALL_VIEWPOINTS: readonly Viewpoint[] = [
  bddViewpoint,
  ibdViewpoint,
  requirementsViewpoint,
  activityViewpoint,
  stateMachineViewpoint,
  useCaseViewpoint,
  parametricViewpoint,
  packageViewpoint,
];

describe('viewpoint.acceptedContextKinds (T-13.30)', () => {
  for (const vp of ALL_VIEWPOINTS) {
    it(`${vp.id} declares its locked acceptedContextKinds`, () => {
      expect(Array.from(vp.acceptedContextKinds)).toEqual(EXPECTED[vp.id]);
    });
  }

  it('every viewpoint declares at least one accepted context kind', () => {
    for (const vp of ALL_VIEWPOINTS) {
      expect(vp.acceptedContextKinds.length).toBeGreaterThan(0);
    }
  });
});
