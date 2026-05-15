import { expect, test } from '@playwright/test';

test.describe('header inline project rename', () => {
  test('clicking the project name commits a rename that survives reload', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();

    const nameButton = page.getByTestId('workspace-project-name');
    await expect(nameButton).toBeEnabled();
    await expect(nameButton).toHaveText('Untitled Project');
    await expect(nameButton).toHaveAttribute('title', 'Rename project');

    await nameButton.click();
    const input = page.getByTestId('workspace-project-name-input');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Untitled Project');

    // Real keyboard input replacing the pre-selected text.
    await page.keyboard.type('Acme System');
    await page.keyboard.press('Enter');

    await expect(input).toHaveCount(0);
    await expect(nameButton).toHaveText('Acme System');

    // Reload: the rename persists through sessionStorage.
    await page.reload();
    await expect(page.getByTestId('workspace-project-name')).toHaveText(
      'Acme System',
    );
  });

  test('Escape cancels the rename without mutating the name', async ({
    page,
  }) => {
    await page.goto('/');
    const nameButton = page.getByTestId('workspace-project-name');
    await expect(nameButton).toHaveText('Untitled Project');

    await nameButton.click();
    const input = page.getByTestId('workspace-project-name-input');
    await expect(input).toBeFocused();
    await page.keyboard.type('Discarded');
    await page.keyboard.press('Escape');

    await expect(input).toHaveCount(0);
    await expect(nameButton).toHaveText('Untitled Project');
  });
});
