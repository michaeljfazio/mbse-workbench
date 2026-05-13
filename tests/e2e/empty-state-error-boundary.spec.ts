import { expect, test } from '@playwright/test';

// Phase 12 slice B (issue #232) — empty-state UX and per-surface
// <ErrorBoundary>. A fresh project (no sessionStorage seed) bootstraps to a
// project with zero elements; the canvas surface shows the empty-state CTA
// cards plus the keyboard-shortcut crib. The boundary fallback is exercised
// via a window flag (`__WORKSPACE_FORCE_ERROR__`) read by the test-only
// <ErrorTestThrower> embedded in each boundary.

test.describe('empty-state UX (issue #232)', () => {
  test('fresh project shows empty-state cards and shortcut crib', async ({
    page,
  }) => {
    await page.goto('/');
    const empty = page.getByTestId('workspace-empty-state');
    await expect(empty).toBeVisible();
    await expect(page.getByTestId('empty-state-new-block')).toBeVisible();
    await expect(page.getByTestId('empty-state-new-requirement')).toBeVisible();
    await expect(page.getByTestId('empty-state-import-json')).toBeVisible();
    await expect(page.getByTestId('empty-state-open-chat')).toBeVisible();
    await expect(page.getByTestId('empty-state-shortcuts')).toContainText('Undo');
    await expect(page.getByTestId('empty-state-shortcuts')).toContainText('Cmd-Z');
  });

  test('clicking New Block dismisses the empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('empty-state-new-block').click();
    await expect(page.getByTestId('workspace-empty-state')).toHaveCount(0);
  });

  test('clicking New Requirement switches to the Requirements surface', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('empty-state-new-requirement').click();
    await expect(page.getByTestId('requirements-surface')).toBeVisible();
  });
});

test.describe('error boundaries (issue #232)', () => {
  test('canvas boundary fallback renders and resets', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __WORKSPACE_FORCE_ERROR__?: string }).__WORKSPACE_FORCE_ERROR__ =
        'canvas';
    });
    await page.goto('/');
    const fallback = page.getByTestId('error-boundary-canvas');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText(/Diagram canvas failed to render/i);
    await expect(
      page.getByTestId('error-boundary-canvas-message'),
    ).toContainText('forced error in canvas');

    // Clear the flag, then reset the boundary; the canvas should recover.
    await page.evaluate(() => {
      delete (window as unknown as { __WORKSPACE_FORCE_ERROR__?: string })
        .__WORKSPACE_FORCE_ERROR__;
    });
    await page.getByTestId('error-boundary-canvas-reset').click();
    await expect(page.getByTestId('error-boundary-canvas')).toHaveCount(0);
    await expect(page.getByTestId('canvas-toolbar')).toBeVisible();
  });

  test('requirements boundary catches errors on the Requirements surface', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __WORKSPACE_FORCE_ERROR__?: string }).__WORKSPACE_FORCE_ERROR__ =
        'requirements';
    });
    await page.goto('/');
    await page.getByRole('tab', { name: 'Requirements' }).click();
    await expect(page.getByTestId('error-boundary-requirements')).toContainText(
      /Requirements failed to render/i,
    );
  });
});
