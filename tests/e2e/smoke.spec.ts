import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('app shell renders the MBSE Workbench heading', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /MBSE Workbench/i }),
  ).toBeVisible();
});

test('@a11y app shell has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
