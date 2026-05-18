/**
 * explorer-diagram-row-activate.spec.ts — Closes #462.
 *
 * Walk-24 (dim-13 cross-diagram coherence) reproduced the following: with a
 * Package + a "FCS" PartDefinition + a BDD on the Package + an IBD on the
 * PartDefinition (default name "FCS IBD"), clicking the IBD's tree row at
 * the centre of the row (Playwright's default `.click()` behaviour, and the
 * natural target a mouse user lands on) did not switch the active tab to
 * the IBD. The IBD tab remained `aria-selected="false"`.
 *
 * Root cause: the diagram row's flex layout did not give the label
 * `min-w-0 flex-1`, so the kebab menu trigger sat immediately after a short
 * label. For a 7-char label "FCS IBD" indented two levels in the tree, the
 * row's centre coordinate fell on the kebab button, whose `onClick` calls
 * `stopPropagation()` to prevent activation. The fix is structural — the
 * label now consumes the remaining horizontal space, pushing the kebab to
 * the row's right edge so the centre is always over the label.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

const TREE_ROW = '[data-testid^="containment-tree-element-"]';

async function rowIdByKind(page: Page, kind: string): Promise<string> {
  const row = page.locator(`${TREE_ROW}[data-kind="${kind}"]`).first();
  await expect(row).toBeVisible();
  const testId = await row.getAttribute('data-testid');
  if (testId === null) throw new Error('row had no data-testid');
  return testId.slice('containment-tree-element-'.length);
}

async function openElementRowMenu(page: Page, elementId: string): Promise<Locator> {
  await page
    .getByTestId(`containment-tree-element-menu-trigger-${elementId}`)
    .click({ force: true });
  const menu = page.getByTestId(`containment-tree-element-menu-${elementId}`);
  await expect(menu).toBeVisible();
  return menu;
}

async function createChild(
  page: Page,
  ownerId: string,
  childKind: string,
  childName: string,
): Promise<string> {
  await openElementRowMenu(page, ownerId);
  await page
    .getByTestId(`containment-tree-element-menu-create-child-${ownerId}`)
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-create-${childKind}-member-${ownerId}`,
    )
    .click();
  const renameInput = page
    .locator('input[data-testid^="containment-tree-element-rename-"]')
    .first();
  await expect(renameInput).toBeVisible();
  await renameInput.fill(childName);
  await renameInput.press('Enter');
  const row = page.locator(`${TREE_ROW}[data-kind="${childKind}"]`).last();
  await expect(row).toBeVisible();
  const tid = await row.getAttribute('data-testid');
  if (!tid) throw new Error('child row missing testid');
  return tid.slice('containment-tree-element-'.length);
}

async function createRepresentation(
  page: Page,
  ownerId: string,
  viewpointId: string,
): Promise<string> {
  const before = new Set<string>();
  for (const r of await page
    .locator('[data-testid^="containment-tree-diagram-"]')
    .all()) {
    const tid = await r.getAttribute('data-testid');
    if (!tid) continue;
    if (tid.includes('-menu-') || tid.includes('-rename-')) continue;
    before.add(tid.slice('containment-tree-diagram-'.length));
  }
  await openElementRowMenu(page, ownerId);
  await page
    .getByTestId(`containment-tree-element-menu-create-representation-${ownerId}`)
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-representation-${viewpointId}-${ownerId}`,
    )
    .click();
  // Wait for the new diagram to appear in the tree.
  await expect
    .poll(async () => {
      for (const r of await page
        .locator('[data-testid^="containment-tree-diagram-"]')
        .all()) {
        const tid = await r.getAttribute('data-testid');
        if (!tid) continue;
        if (tid.includes('-menu-') || tid.includes('-rename-')) continue;
        const id = tid.slice('containment-tree-diagram-'.length);
        if (!before.has(id)) return id;
      }
      return null;
    })
    .not.toBeNull();
  for (const r of await page
    .locator('[data-testid^="containment-tree-diagram-"]')
    .all()) {
    const tid = await r.getAttribute('data-testid');
    if (!tid) continue;
    if (tid.includes('-menu-') || tid.includes('-rename-')) continue;
    const id = tid.slice('containment-tree-diagram-'.length);
    if (!before.has(id)) return id;
  }
  throw new Error('new diagram never appeared');
}

test.describe('Project-tree diagram row activates its tab on a centre click (#462)', () => {
  test('walk-24 repro: clicking a short-named diagram row activates its tab', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    // Match walk-24's bootstrap: Package + FCS PartDefinition under it +
    // BDD on the Package + IBD on the FCS PartDefinition. The IBD's default
    // name is "FCS IBD" (7 chars) — short enough that, before the fix, the
    // row's centre coordinate fell on the kebab button.
    const packageId = await rowIdByKind(page, 'Package');
    const fcsId = await createChild(page, packageId, 'PartDefinition', 'FCS');

    const bddId = await createRepresentation(page, packageId, 'bdd');
    const ibdId = await createRepresentation(page, fcsId, 'ibd');

    // The IBD became active when it was created. Switch to the BDD to set
    // up the repro: now we need a tree-row click on the IBD to switch
    // back to it.
    await page.getByTestId(`diagram-tab-${bddId}`).click();
    await expect(page.getByTestId(`diagram-tab-${bddId}`)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId(`diagram-tab-${ibdId}`)).toHaveAttribute(
      'aria-selected',
      'false',
    );

    // Dismiss any lingering menu/popover that could intercept the next click.
    await page.keyboard.press('Escape');

    // The canonical Explorer affordance: click the diagram row at its centre.
    // Before the fix this landed on the kebab and the row's onClick never
    // fired; the tab stayed unselected.
    await page.getByTestId(`containment-tree-diagram-${ibdId}`).click();

    await expect(page.getByTestId(`diagram-tab-${ibdId}`)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId(`diagram-tab-${bddId}`)).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});
