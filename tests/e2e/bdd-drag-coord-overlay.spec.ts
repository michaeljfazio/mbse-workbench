/**
 * E2E tests — BDD drag-coord overlay (issue #375).
 *
 * Verifies:
 * 1. A `data-testid="drag-coord-overlay"` element appears while dragging a
 *    block on the BDD canvas and shows the expected `(x, y)` text format.
 * 2. The overlay disappears after mouse-up (drag-stop).
 * 3. @visual — a screenshot baseline is captured mid-drag with the overlay
 *    visible (mouse still down).
 * 4. @a11y — no serious/critical axe violations after drag-stop (normal
 *    rendering, overlay gone).
 *
 * Visual baselines are captured on both Chromium and WebKit with CI=true so
 * they are consistent with the Linux CI renderer. Platform-font differences
 * between local macOS and CI Linux mean baselines are generated fresh — a new
 * baseline is expected and documented here:
 *
 *   tests/e2e/__screenshots__/bdd-drag-coord-overlay.spec.ts/
 *     bdd-mid-drag-overlay-chromium.png  (NEW — mid-drag, overlay visible)
 *     bdd-mid-drag-overlay-webkit.png    (NEW — mid-drag, overlay visible)
 *
 * Refs #375
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers (mirror bdd-block-resize.spec.ts pattern)
// ---------------------------------------------------------------------------

async function addBlock(page: Page): Promise<Locator> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(before).toHaveCount(beforeCount + 1);
  return page.locator('[data-testid^="bdd-block-"][data-element-id]').nth(beforeCount);
}

async function placeBlockAt(
  page: Page,
  block: Locator,
  x: number,
  y: number,
): Promise<void> {
  const flowPane = page.locator('.react-flow__pane');
  const flowBox = await flowPane.boundingBox();
  if (!flowBox) throw new Error('react-flow pane not found');
  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error('block bounding box missing');

  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + 10;
  const targetX = flowBox.x + x + blockBox.width / 2;
  const targetY = flowBox.y + y + 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 4, startY + 4, { steps: 2 });
  await page.mouse.move(targetX, targetY, { steps: 16 });
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('BDD drag-coord overlay (issue #375)', () => {
  test('overlay appears during drag and shows (x, y) format', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    // Begin a new drag — press mouse down on the block header
    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error('block bounding box missing');

    const grabX = blockBox.x + blockBox.width / 2;
    const grabY = blockBox.y + 10; // stereotype header area

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();

    // Move 60 px right and 40 px down (steps ensure React Flow fires onNodeDrag)
    await page.mouse.move(grabX + 30, grabY + 20, { steps: 5 });
    await page.mouse.move(grabX + 60, grabY + 40, { steps: 10 });

    // Overlay must be visible while mouse is still down
    const overlay = page.getByTestId('drag-coord-overlay');
    await expect(overlay).toBeVisible();

    // Overlay text must match the (x, y) format — integers in parentheses
    const text = await overlay.textContent();
    expect(text).toMatch(/^\(-?\d+, -?\d+\)$/);

    // Release the mouse
    await page.mouse.up();

    // Overlay must disappear after drag-stop
    await expect(overlay).not.toBeVisible();
  });

  test('overlay text reflects canvas position after drag move', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);

    // Place at known canvas position (200, 140) — viewport starts at identity
    await placeBlockAt(page, block, 200, 140);

    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error('block bounding box missing');

    // Grab and drag 60 px right + 40 px down
    const grabX = blockBox.x + blockBox.width / 2;
    const grabY = blockBox.y + 10;

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 30, grabY + 20, { steps: 5 });
    await page.mouse.move(grabX + 60, grabY + 40, { steps: 10 });

    const overlay = page.getByTestId('drag-coord-overlay');
    await expect(overlay).toBeVisible();

    // The displayed text must parse as valid integers in parentheses
    const text = (await overlay.textContent()) ?? '';
    const match = text.match(/^\((-?\d+), (-?\d+)\)$/);
    expect(match).not.toBeNull();
    // x coordinate should be non-negative (block was placed at x=200)
    if (match) {
      expect(Number(match[1])).toBeGreaterThan(0);
    }

    await page.mouse.up();
    await expect(overlay).not.toBeVisible();
  });

  test('@a11y no serious/critical axe violations mid-drag and post-drag', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error('block bounding box missing');

    const grabX = blockBox.x + blockBox.width / 2;
    const grabY = blockBox.y + 10;

    // === Mid-drag axe scan ===
    // Initiate the drag and pause with the overlay rendered. The overlay is
    // a real interactive screen state per kickoff rubric dim 25, so it must
    // pass the same axe ruleset as any other UI state.
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 60, grabY + 40, { steps: 10 });
    const overlay = page.getByTestId('drag-coord-overlay');
    await expect(overlay).toBeVisible();

    const midDragResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const midDragBlocking = midDragResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(midDragBlocking, JSON.stringify(midDragBlocking, null, 2)).toEqual([]);

    // Release the drag
    await page.mouse.up();
    await expect(overlay).not.toBeVisible();

    // === Post-drag-stop axe scan ===
    // Click canvas to deselect, then re-scan.
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('pane not found');
    await page.mouse.click(paneBox.x + paneBox.width - 60, paneBox.y + 30);

    const postDragResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const postDragBlocking = postDragResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(postDragBlocking, JSON.stringify(postDragBlocking, null, 2)).toEqual([]);
  });

  test('@visual bdd-mid-drag-overlay baseline — overlay visible, mouse still down', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    // Initiate drag — DO NOT release before screenshot
    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error('block bounding box missing');

    const grabX = blockBox.x + blockBox.width / 2;
    const grabY = blockBox.y + 10;

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 30, grabY + 20, { steps: 5 });
    await page.mouse.move(grabX + 60, grabY + 40, { steps: 10 });

    // Overlay must be visible before we take the screenshot
    const overlay = page.getByTestId('drag-coord-overlay');
    await expect(overlay).toBeVisible();

    // Capture baseline — mouse is still down, overlay visible
    await expect(page).toHaveScreenshot('bdd-mid-drag-overlay.png', {
      fullPage: false,
    });

    // Release mouse (cleanup)
    await page.mouse.up();
  });
});
