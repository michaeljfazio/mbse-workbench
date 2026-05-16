import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Phase 14 gate spec (issue #355). Closes the Phase 14 epic.
//
// AGENT.md / epic #342 Phase 14 gate verbatim:
//   - Library elements load as a sibling tree of the user root under a
//     "Libraries" header in the explorer, with a lock badge on each
//     read-only subtree.
//   - Destructive operations on library elements are rejected at the
//     command bus with a `LibraryViolationError` and a toast on rejection.
//   - SysMLv2 text round-trip preserves `import Pkg::*` directives.
//   - A model that references a library symbol by unqualified name parses,
//     re-serializes, and reloads losslessly (modulo IDs).
//
// This spec covers the two gate items the issue calls out for T-14.07:
//
//   1. Cold-start UI walkthrough exercises the library tree (read-only).
//   2. A model with an `import` directive round-trips through the UI.
//
// The destructive-op-rejection gate item is covered by the T-14.02 unit
// tests in `tests/unit/library/libraryGuard.test.ts` and is not re-asserted
// here — the focus is the UI surface that the unit tests cannot reach.

const SEED_PROJECT_ID = 'p-phase-14-gate';

// KerML core ids — duplicated as string literals so the spec stays
// dependency-free with respect to `src/` (matches the seed-by-literals
// pattern in every other Playwright gate spec).
const KERML_CORE_BASE_ID = 'kerml.core.Base';
const KERML_CORE_PART_ID = 'kerml.core.Base.Part';

// User-element ids: a single Package owning a PartUsage typed by the
// KerML `Part` library element. This is the minimum shape that triggers
// the serializer's `import Base::*;` directive and exercises namespace
// resolution on re-import.
const ROOT_PKG_ID = 'p14-root-pkg';
const DEMO_PKG_ID = 'p14-demo-pkg';
const MY_PART_ID = 'p14-my-part';

const SEED_ELEMENTS = [
  {
    // Identifier-style name (no spaces) so the root package round-trips
    // through the SysMLv2 text serializer/parser cleanly. Free-text names
    // with whitespace are a serializer limitation outside Phase 14 scope.
    id: ROOT_PKG_ID,
    kind: 'Package',
    name: 'Phase14Gate',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  },
  {
    id: DEMO_PKG_ID,
    kind: 'Package',
    name: 'Demo',
    ownerId: ROOT_PKG_ID,
    ownerRole: 'member',
    ownerIndex: 0,
  },
  {
    id: MY_PART_ID,
    kind: 'PartUsage',
    name: 'myPart',
    ownerId: DEMO_PKG_ID,
    ownerRole: 'member',
    ownerIndex: 0,
    definitionId: KERML_CORE_PART_ID,
  },
] as const;

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, rootId, elements }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-16T10:00:00.000Z';
      const project = {
        id: projectId,
        name: 'Phase 14 Gate Seed',
        createdAt: now,
        modifiedAt: now,
        rootId,
        elements,
        edges: [],
        diagrams: [],
        history: { undo: [], redo: [] },
        conversations: [],
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      rootId: ROOT_PKG_ID,
      elements: SEED_ELEMENTS,
    },
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly ownerId?: string | null;
  readonly definitionId?: string;
}

interface StoredProject {
  readonly id: string;
  readonly elements: readonly StoredElement[];
  readonly libraryRootIds?: readonly string[];
}

async function readPersistedProject(
  page: Page,
  projectId: string,
): Promise<StoredProject | null> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (raw === null) return null;
    return JSON.parse(raw) as StoredProject;
  }, projectId);
}

test.describe('Phase 14 gate (issue #355)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('cold-start UI: Libraries section renders KerML root with lock badges, expands to read-only descendants', async ({
    page,
  }) => {
    // Step 1 — the Libraries section is present alongside the project tree.
    const section = page.getByTestId('libraries-section');
    await expect(section).toBeVisible();
    await expect(page.getByTestId('libraries-section-header')).toContainText(
      /libraries/i,
    );

    // Step 2 — KerML root appears with its lock badge and is flagged
    // read-only at the DOM layer.
    const baseRow = page.getByTestId(`libraries-tree-element-${KERML_CORE_BASE_ID}`);
    await expect(baseRow).toBeVisible();
    await expect(baseRow).toHaveAttribute('data-readonly', 'true');
    await expect(baseRow).toHaveAttribute('draggable', 'false');
    await expect(baseRow.getByTestId('libraries-lock-badge')).toBeVisible();

    // Step 3 — expand the KerML root and assert Part (and at least one
    // other named library descendant) appear, each with their own lock
    // badge. Library subtrees default-collapsed (iter-785) so the user
    // must click the disclosure to reveal them.
    await page
      .getByTestId(`libraries-tree-disclosure-${KERML_CORE_BASE_ID}`)
      .click();
    const partRow = page.getByTestId(`libraries-tree-element-${KERML_CORE_PART_ID}`);
    await expect(partRow).toBeVisible();
    await expect(partRow).toHaveAttribute('data-readonly', 'true');
    await expect(partRow.getByTestId('libraries-lock-badge')).toBeVisible();

    // The lock badge appears on every visible row (root + descendants),
    // not only the root — library descendants inherit read-only-ness via
    // the containment chain (iter-783 decision).
    const allLockBadges = page
      .getByTestId('libraries-tree')
      .getByTestId('libraries-lock-badge');
    expect(await allLockBadges.count()).toBeGreaterThanOrEqual(2);
  });

  test('round-trip: SysMLv2 export of a project referencing Base::Part emits import directive; re-import preserves library reference', async ({
    page,
  }) => {
    // Step 1 — sanity-check the seed loaded: the user PartUsage exists in
    // the persisted project and points at the KerML library `Part`.
    //
    // Note: the persisted project does NOT carry `libraryRootIds` for
    // *standard* libraries — `stripStandardLibrary` at the save boundary
    // removes them so sessionStorage stays "user content only" (iter-785).
    // The library is re-merged by `applyStandardLibrary` on load. Library
    // hydration is verified by Test 1 (Libraries section renders) and by
    // the post-import / post-reload assertions below.
    await expect
      .poll(async () => {
        const proj = await readPersistedProject(page, SEED_PROJECT_ID);
        if (!proj) return null;
        return proj.elements.find((e) => e.id === MY_PART_ID)?.definitionId ?? null;
      })
      .toBe(KERML_CORE_PART_ID);

    const preExport = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(preExport).not.toBeNull();
    const preExportUserPart = preExport!.elements.find(
      (e) => e.id === MY_PART_ID,
    );
    expect(preExportUserPart?.kind).toBe('PartUsage');
    expect(preExportUserPart?.definitionId).toBe(KERML_CORE_PART_ID);

    // Step 2 — Export the project as SysMLv2 text.
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-sysml').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.sysml$/);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const exportedText = readFileSync(tmpPath!, 'utf-8');

    // The exported text must:
    //   - Declare the library dependency via `import Base::*;`.
    //   - Render the user PartUsage using the library short name `Part`,
    //     not the fully-qualified id.
    //   - NOT embed the KerML core library subtree (stripped at the
    //     persistence boundary per ADR 0013 / iter-785).
    expect(exportedText).toContain('import Base::*;');
    expect(exportedText).toMatch(/part\s+myPart\s*:\s*Part\b/);
    expect(exportedText).not.toContain('package Base {');

    // Step 3 — Re-import the captured text via Import → SysMLv2.
    await page.getByTestId('toolbar-import').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('toolbar-import-sysml').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'phase-14-roundtrip.sysml',
      mimeType: 'text/plain',
      buffer: Buffer.from(exportedText, 'utf-8'),
    });

    // Wait for the importer to commit — poll until the persisted project
    // again contains the user PartUsage. The importer rebuilds the project
    // and persists it under the same id (header `// id:` is the recovery
    // channel), then `applyStandardLibrary` re-merges KerML on load.
    await expect
      .poll(
        async () => {
          const proj = await readPersistedProject(page, SEED_PROJECT_ID);
          if (!proj) return null;
          const usage = proj.elements.find((e) => e.id === MY_PART_ID);
          return usage?.definitionId ?? null;
        },
        { timeout: 15_000 },
      )
      .toBe(KERML_CORE_PART_ID);

    // No import error banner.
    await expect(page.getByTestId('import-error-banner')).toBeHidden();

    // Step 4 — Post-import structural check: the user PartUsage still
    // resolves to the KerML library `Part` element (definitionId
    // round-tripped exactly because `// id:` comments survive both
    // serialize and parse).
    const persisted = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(persisted).not.toBeNull();
    const userPart = persisted!.elements.find((e) => e.id === MY_PART_ID);
    expect(userPart?.kind).toBe('PartUsage');
    expect(userPart?.definitionId).toBe(KERML_CORE_PART_ID);

    // The `Demo` package survives the round-trip too (containment intact).
    const demoPkg = persisted!.elements.find((e) => e.id === DEMO_PKG_ID);
    expect(demoPkg?.kind).toBe('Package');
    expect(demoPkg?.name).toBe('Demo');

    // Cold-reload to assert persistence: the round-trip survives a page
    // refresh. The Libraries section re-renders the KerML root.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
    await expect(
      page.getByTestId(`libraries-tree-element-${KERML_CORE_BASE_ID}`),
    ).toBeVisible();
    const postReload = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(postReload).not.toBeNull();
    const postReloadPart = postReload!.elements.find(
      (e) => e.id === MY_PART_ID,
    );
    expect(postReloadPart?.definitionId).toBe(KERML_CORE_PART_ID);
  });
});
