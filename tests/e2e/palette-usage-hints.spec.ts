/**
 * palette-usage-hints.spec.ts — Closes #373.
 *
 * Definition categories in the project tree show a "+" button to create a
 * direct child of the root Package. Usage categories (PartUsage / ActionUsage
 * / StateUsage / ConstraintUsage / ValueProperty / PortUsage /
 * ConnectionUsage / ItemFlow / Transition) intentionally don't, because those
 * kinds are context-dependent — they live inside a parent diagram or owning
 * element. Walk-1 (iter-794) flagged the resulting asymmetry as a missing
 * feature; this spec verifies the explanatory "?" indicator is now in place
 * and carries a hint pointing the architect at the actual creation surface.
 */

import { expect, test } from '@playwright/test';

const USAGE_HINT_GROUPS: ReadonlyArray<{
  readonly kind: string;
  readonly hintIncludes: string;
}> = [
  { kind: 'PartUsage', hintIncludes: 'Internal Block Diagram' },
  { kind: 'ActionUsage', hintIncludes: 'Activity' },
  { kind: 'StateUsage', hintIncludes: 'State Machine' },
  { kind: 'ConstraintUsage', hintIncludes: 'Parametric' },
  { kind: 'ValueProperty', hintIncludes: 'Parametric' },
];

test.describe('Palette usage-category hints (#373)', () => {
  test('every always-visible usage category exposes a "?" indicator with a creation hint', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    for (const { kind, hintIncludes } of USAGE_HINT_GROUPS) {
      const header = page.getByTestId(`project-tree-group-${kind}`);
      await expect(header, `${kind} group header should be visible`).toBeVisible();

      // Asymmetry baseline: no "+" button under this header.
      await expect(
        page.getByTestId(`project-tree-group-create-${kind}`),
        `${kind} should not have a "+" create button`,
      ).toHaveCount(0);

      // "?" indicator is present, carries a creation hint, and is non-interactive.
      const hint = page.getByTestId(`project-tree-group-hint-${kind}`);
      await expect(hint).toBeVisible();
      await expect(hint).toHaveText('?');
      await expect(hint).toHaveAttribute(
        'title',
        expect.stringContaining(hintIncludes),
      );
      await expect(hint).toHaveAttribute(
        'aria-label',
        expect.stringContaining(`How to create`),
      );
    }
  });

  test('definition categories keep their "+" button and do not show a "?" hint', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    // PartDefinition is a representative definition kind — its "+" must remain
    // and a "?" hint must NOT be rendered next to it (the two affordances are
    // mutually exclusive by construction).
    await expect(
      page.getByTestId('project-tree-group-create-PartDefinition'),
    ).toBeVisible();
    await expect(
      page.getByTestId('project-tree-group-hint-PartDefinition'),
    ).toHaveCount(0);
  });
});
