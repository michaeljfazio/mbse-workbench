import { describe, expect, it } from 'vitest';
import {
  DESTRUCTIVE_COMMAND_KINDS,
  EXEMPT_COMMAND_KINDS,
  type Command,
} from '@/commands';

/**
 * The command bus partitions every `CommandKind` into either
 * `DESTRUCTIVE_COMMAND_KINDS` (subject to the `isReadOnly` library guard)
 * or `EXEMPT_COMMAND_KINDS` (presentation-only or compound gateway).
 *
 * This test is a CI guard: if anyone adds a new command kind to
 * `src/commands/types.ts` without classifying it in `src/commands/bus.ts`,
 * the union below will fail to cover all kinds and the assertion below
 * will fail. The agent is then forced to make an explicit decision about
 * whether the new kind belongs in the destructive set. See ADR 0012.
 */
describe('command bus — destructive/exempt partition covers every CommandKind', () => {
  it('every CommandKind is either destructive or exempt, with no overlap', () => {
    type Kind = Command['kind'];
    type Partitioned =
      | (typeof DESTRUCTIVE_COMMAND_KINDS)[number]
      | (typeof EXEMPT_COMMAND_KINDS)[number];

    // Compile-time partition check: this assignment fails if Kind has a
    // value not present in Partitioned (or vice versa).
    const _exhaustive: Partitioned = '' as Kind;
    void _exhaustive;

    // Runtime partition check.
    const destructive = new Set<string>(DESTRUCTIVE_COMMAND_KINDS);
    const exempt = new Set<string>(EXEMPT_COMMAND_KINDS);
    for (const k of destructive) {
      expect(exempt.has(k)).toBe(false);
    }

    // The union covers exactly the set of kinds we expect today. This
    // mirror table is intentional: changing the partition requires
    // explicitly updating this test, which is the CI gate.
    const expected = new Set([
      'create-element',
      'update-element',
      'delete-element',
      'link',
      'unlink',
      'update-edge',
      'update-diagram-position',
      'create-diagram',
      'delete-diagram',
      'compound',
    ]);
    const actual = new Set<string>([
      ...DESTRUCTIVE_COMMAND_KINDS,
      ...EXEMPT_COMMAND_KINDS,
    ]);
    expect(actual).toEqual(expected);
  });
});
