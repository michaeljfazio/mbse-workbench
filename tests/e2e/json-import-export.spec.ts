import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Phase 12 slice A (issue #231) — JSON import/export in workspace UI.

const SEED_PROJECT_ID = 'p-json-import-export';

const SEED_ELEMENTS = [
  {
    id: 'json-block-alpha',
    kind: 'PartDefinition',
    name: 'Alpha',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'json-block-beta',
    kind: 'PartDefinition',
    name: 'Beta',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
];

const SEED_EDGES = [
  {
    id: 'json-edge-composition',
    kind: 'Generalization',
    sourceId: 'json-block-beta',
    targetId: 'json-block-alpha',
  },
];

const SEED_DIAGRAM = {
  id: 'd-bdd',
  viewpointId: 'bdd',
  name: 'BDD',
  positions: {
    'json-block-alpha': { x: 120, y: 120 },
    'json-block-beta': { x: 360, y: 280 },
  },
};

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, elements, edges, diagram }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-14T10:00:00.000Z';
      const project = {
        id: projectId,
        name: 'JSON Round-trip',
        createdAt: now,
        modifiedAt: now,
        elements,
        edges,
        diagrams: [diagram],
        history: { undo: [], redo: [] },
        conversations: [],
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      elements: SEED_ELEMENTS,
      edges: SEED_EDGES,
      diagram: SEED_DIAGRAM,
    },
  );
}

interface StoredProject {
  readonly id: string;
  readonly name: string;
  readonly elements: ReadonlyArray<Record<string, unknown>>;
  readonly edges: ReadonlyArray<Record<string, unknown>>;
  readonly diagrams: ReadonlyArray<Record<string, unknown>>;
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

function canonicalize(
  list: ReadonlyArray<Record<string, unknown>>,
): ReadonlyArray<Record<string, unknown>> {
  return [...list]
    .map((item) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item)) {
        if (v === undefined) continue;
        cleaned[k] = v;
      }
      return cleaned;
    })
    .sort((a, b) => String(a['id']).localeCompare(String(b['id'])));
}

test.describe('Phase 12 slice A — JSON import/export', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('Export JSON downloads project as a .json file', async ({ page }) => {
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-json').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const text = readFileSync(tmpPath!, 'utf-8');
    const parsed = JSON.parse(text) as StoredProject;
    expect(parsed.id).toBe(SEED_PROJECT_ID);
    expect(parsed.elements).toHaveLength(SEED_ELEMENTS.length);
    expect(parsed.edges).toHaveLength(SEED_EDGES.length);
    expect(parsed.diagrams).toHaveLength(1);
  });

  test('round-trips: Export JSON → Import JSON yields identical model', async ({
    page,
  }) => {
    // Export
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-json').click(),
    ]);
    const tmpPath = await download.path();
    const exportedText = readFileSync(tmpPath!, 'utf-8');

    // Import the same payload back via the file chooser
    await page.getByTestId('toolbar-import').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('toolbar-import-json').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'round-trip.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportedText, 'utf-8'),
    });

    // After import, the persisted project should have identical
    // elements, edges, and diagrams (positions included).
    await expect
      .poll(async () => {
        const proj = await readPersistedProject(page, SEED_PROJECT_ID);
        if (!proj) return -1;
        return proj.elements.length + proj.edges.length + proj.diagrams.length;
      })
      .toBe(SEED_ELEMENTS.length + SEED_EDGES.length + 1);

    const persisted = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(persisted).not.toBeNull();
    expect(persisted!.id).toBe(SEED_PROJECT_ID);
    expect(persisted!.name).toBe('JSON Round-trip');
    expect(canonicalize(persisted!.elements)).toEqual(canonicalize(SEED_ELEMENTS));
    expect(canonicalize(persisted!.edges)).toEqual(canonicalize(SEED_EDGES));
    expect(canonicalize(persisted!.diagrams)).toEqual(canonicalize([SEED_DIAGRAM]));

    // No import error banner.
    await expect(page.getByTestId('import-error-banner')).toBeHidden();
  });

  test('Import JSON surfaces an error banner on invalid JSON', async ({
    page,
  }) => {
    await page.getByTestId('toolbar-import').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('toolbar-import-json').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{not valid json', 'utf-8'),
    });

    await expect(page.getByTestId('import-error-banner')).toBeVisible();
    await expect(page.getByTestId('import-error-banner-text')).toContainText(
      /invalid JSON/i,
    );

    // Persisted project should be untouched (still has original elements).
    const persisted = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(persisted).not.toBeNull();
    expect(persisted!.elements).toHaveLength(SEED_ELEMENTS.length);
  });
});
