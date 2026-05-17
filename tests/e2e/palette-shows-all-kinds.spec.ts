/**
 * palette-shows-all-kinds.spec.ts — Fixes #372
 *
 * Asserts that every element-definition kind creatable under the project root
 * appears in the palette from app load, with a "+" button, even before any
 * element of that kind has been created. Previously, ActionDefinition,
 * StateDefinition, ConstraintDefinition, InterfaceDefinition, and
 * PortDefinition were hidden until the architect had already created one via
 * the deep "Create child…" submenu — a chicken-and-egg discoverability gap.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// All definition kinds that must appear from empty state, with a "+" button.
// These are keyed by ElementKind (data-testid suffix) and expected aria-label.
const ALWAYS_VISIBLE_DEFINITION_GROUPS: ReadonlyArray<{
  kind: string;
  createLabel: string;
}> = [
  { kind: 'Package', createLabel: 'New Package' },
  { kind: 'PartDefinition', createLabel: 'New Part Definition' },
  { kind: 'InterfaceDefinition', createLabel: 'New Interface Definition' },
  { kind: 'PortDefinition', createLabel: 'New Port Definition' },
  { kind: 'ActionDefinition', createLabel: 'New Action Definition' },
  { kind: 'StateDefinition', createLabel: 'New State Definition' },
  { kind: 'ConstraintDefinition', createLabel: 'New Constraint Definition' },
  { kind: 'Requirement', createLabel: 'New Requirement' },
  { kind: 'Actor', createLabel: 'New Actor' },
  { kind: 'UseCase', createLabel: 'New Use Case' },
];

test.describe('Palette shows all element-kind categories from empty state (#372)', () => {
  test('all definition-kind groups are visible with "+" buttons on fresh load', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for the project tree to be mounted.
    await expect(page.getByTestId('project-tree')).toBeVisible();

    for (const { kind, createLabel } of ALWAYS_VISIBLE_DEFINITION_GROUPS) {
      // Group header is visible.
      await expect(
        page.getByTestId(`project-tree-group-${kind}`),
        `expected ${kind} group header to be visible`,
      ).toBeVisible();

      // "+" create button is present and labelled correctly.
      await expect(
        page.getByTestId(`project-tree-group-create-${kind}`),
        `expected ${kind} create button to be visible`,
      ).toBeVisible();
      await expect(
        page.getByTestId(`project-tree-group-create-${kind}`),
      ).toHaveAttribute('aria-label', createLabel);
    }
  });

  test('clicking "+" for a previously-hidden kind (ActionDefinition) creates the element', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    // The ActionDefinition group must already be visible — no prior creation needed.
    const groupHeader = page.getByTestId('project-tree-group-ActionDefinition');
    await expect(groupHeader).toBeVisible();
    await expect(groupHeader).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Action definitions (0)'),
    );

    // Click the "+" button.
    await page.getByTestId('project-tree-group-create-ActionDefinition').click();

    // A leaf should appear under the ActionDefinition group.
    const leaves = page.locator('[data-testid^="project-tree-leaf-"]');
    await expect(leaves).toHaveCount(1);

    // Group count updates to 1.
    await expect(groupHeader).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Action definitions (1)'),
    );
  });

  test('clicking "+" for StateDefinition creates the element', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    await page.getByTestId('project-tree-group-create-StateDefinition').click();

    const leaves = page.locator('[data-testid^="project-tree-leaf-"]');
    await expect(leaves).toHaveCount(1);

    await expect(
      page.getByTestId('project-tree-group-StateDefinition'),
    ).toHaveAttribute('aria-label', expect.stringContaining('State definitions (1)'));
  });

  test('clicking "+" for ConstraintDefinition creates the element', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    await page.getByTestId('project-tree-group-create-ConstraintDefinition').click();

    const leaves = page.locator('[data-testid^="project-tree-leaf-"]');
    await expect(leaves).toHaveCount(1);

    await expect(
      page.getByTestId('project-tree-group-ConstraintDefinition'),
    ).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Constraint definitions (1)'),
    );
  });

  test('@a11y palette pane has no serious or critical violations on fresh load', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="project-tree-pane"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
