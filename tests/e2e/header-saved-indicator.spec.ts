import { expect, test } from '@playwright/test';

test.describe('header saved-indicator', () => {
  test('cold load shows "Saved" with a parseable title (T-13.09)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();
    // Wait for bootstrap — the project-name button becomes enabled once
    // the workspace store finishes loading the session.
    await expect(page.getByTestId('workspace-project-name')).toBeEnabled();

    const indicator = page.getByTestId('workspace-saved-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('Saved');
    await expect(indicator).toHaveAttribute('data-state', 'clean');

    const title = await indicator.getAttribute('title');
    expect(title).toMatch(/^Last saved /);
  });
});
