import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// v1.0.0 final gate (issue #250). AGENT.md "Final gate — COMPLETE":
//   "Full smoke: create project, build a small system across at least 4
//    viewpoints, add 5+ requirements, link them, ask LLM to critique
//    (with recorded fixture), export to SysMLv2 text, re-import, model
//    matches."
//
// This spec is the verification artifact for the final gate. The
// phase-12 gate already proves multi-viewpoint smoke + SysMLv2
// round-trip; this gate goes further with five traced requirements and
// a recorded LLM critique flow, all in a single Playwright run.

const SEED_PROJECT_ID = 'p-final-gate';

const SEED_ELEMENTS = [
  // BDD — two blocks linked by composition.
  {
    id: 'fg-block-vessel',
    kind: 'PartDefinition',
    name: 'Vessel',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'fg-block-pump',
    kind: 'PartDefinition',
    name: 'Pump',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  // IBD — a PartUsage typed by Vessel.
  {
    id: 'fg-part-mainvessel',
    kind: 'PartUsage',
    name: 'mainVessel',
    definitionId: 'fg-block-vessel',
    portUsageIds: [],
  },
  // Activity — two actions linked by control flow.
  {
    id: 'fg-action-start',
    kind: 'ActionUsage',
    name: 'StartMission',
    nodeType: 'action',
  },
  {
    id: 'fg-action-finish',
    kind: 'ActionUsage',
    name: 'FinishMission',
    nodeType: 'action',
  },
  // Five requirements — one per traceability flavour plus one extra.
  {
    id: 'fg-req-mission',
    kind: 'Requirement',
    name: 'Mission',
    text: 'The system shall complete its mission.',
    reqId: 'R-001',
    priority: 'high',
    status: 'approved',
  },
  {
    id: 'fg-req-safety',
    kind: 'Requirement',
    name: 'Safety',
    text: 'The system shall fail safe.',
    reqId: 'R-002',
    priority: 'critical',
    status: 'approved',
  },
  {
    id: 'fg-req-flow',
    kind: 'Requirement',
    name: 'FlowRate',
    text: 'The pump shall sustain nominal flow.',
    reqId: 'R-003',
    priority: 'medium',
    status: 'approved',
  },
  {
    id: 'fg-req-startup',
    kind: 'Requirement',
    name: 'Startup',
    text: 'Mission start shall be acknowledged.',
    reqId: 'R-004',
    priority: 'medium',
    status: 'approved',
  },
  {
    id: 'fg-req-shutdown',
    kind: 'Requirement',
    name: 'Shutdown',
    text: 'Mission end shall be acknowledged.',
    reqId: 'R-005',
    priority: 'low',
    status: 'approved',
  },
] as const;

const SEED_EDGES = [
  {
    id: 'fg-edge-comp',
    kind: 'Composition',
    sourceId: 'fg-block-vessel',
    targetId: 'fg-block-pump',
  },
  {
    id: 'fg-edge-controlflow',
    kind: 'ControlFlow',
    sourceId: 'fg-action-start',
    targetId: 'fg-action-finish',
  },
  // Five requirement traces, one per requirement, mixing trace kinds.
  {
    id: 'fg-trace-mission',
    kind: 'RequirementTrace',
    sourceId: 'fg-req-mission',
    targetId: 'fg-block-vessel',
    traceKind: 'satisfy',
  },
  {
    id: 'fg-trace-safety',
    kind: 'RequirementTrace',
    sourceId: 'fg-req-safety',
    targetId: 'fg-block-vessel',
    traceKind: 'verify',
  },
  {
    id: 'fg-trace-flow',
    kind: 'RequirementTrace',
    sourceId: 'fg-req-flow',
    targetId: 'fg-block-pump',
    traceKind: 'satisfy',
  },
  {
    id: 'fg-trace-startup',
    kind: 'RequirementTrace',
    sourceId: 'fg-req-startup',
    targetId: 'fg-action-start',
    traceKind: 'derive',
  },
  {
    id: 'fg-trace-shutdown',
    kind: 'RequirementTrace',
    sourceId: 'fg-req-shutdown',
    targetId: 'fg-action-finish',
    traceKind: 'refine',
  },
] as const;

interface DiagramTab {
  readonly diagramId: string;
  readonly viewpointId: string;
  readonly name: string;
  readonly signatureSelector: string;
}

// Four viewpoints, per the AGENT.md minimum ("≥4 viewpoints"). Each
// signature element is one we know renders on the seeded diagram.
const DIAGRAM_TABS: readonly DiagramTab[] = [
  {
    diagramId: 'd-bdd',
    viewpointId: 'bdd',
    name: 'BDD',
    signatureSelector: '[data-testid="bdd-block-fg-block-vessel"]',
  },
  {
    diagramId: 'd-ibd',
    viewpointId: 'ibd',
    name: 'IBD',
    signatureSelector: '[data-testid="ibd-part-fg-part-mainvessel"]',
  },
  {
    diagramId: 'd-requirements',
    viewpointId: 'requirements',
    name: 'Reqs',
    signatureSelector: '[data-testid="requirements-req-fg-req-mission"]',
  },
  {
    diagramId: 'd-activity',
    viewpointId: 'activity',
    name: 'Act',
    signatureSelector: '[data-testid="activity-action-fg-action-start"]',
  },
];

function buildPositions(elementIds: readonly string[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  elementIds.forEach((id, i) => {
    out[id] = { x: 120 + (i % 3) * 220, y: 120 + Math.floor(i / 3) * 160 };
  });
  return out;
}

const SEED_DIAGRAMS = DIAGRAM_TABS.map((tab) => {
  const positionsFor: Record<string, readonly string[]> = {
    'd-bdd': ['fg-block-vessel', 'fg-block-pump'],
    'd-ibd': ['fg-part-mainvessel'],
    'd-requirements': [
      'fg-req-mission',
      'fg-req-safety',
      'fg-req-flow',
      'fg-req-startup',
      'fg-req-shutdown',
    ],
    'd-activity': ['fg-action-start', 'fg-action-finish'],
  };
  return {
    id: tab.diagramId,
    viewpointId: tab.viewpointId,
    name: tab.name,
    positions: buildPositions(positionsFor[tab.diagramId] ?? []),
  };
});

const FIXTURE_PATH = resolve(
  process.cwd(),
  'tests/fixtures/llm/final-gate-critique.json',
);

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, elements, edges, diagrams }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-14T10:00:00.000Z';
      const project = {
        id: projectId,
        name: 'Final Gate Seed',
        createdAt: now,
        modifiedAt: now,
        elements,
        edges,
        diagrams,
        history: { undo: [], redo: [] },
        conversations: [],
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      elements: SEED_ELEMENTS,
      edges: SEED_EDGES,
      diagrams: SEED_DIAGRAMS,
    },
  );
}

async function injectApiKey(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('mbse-workbench:anthropic-api-key', 'sk-ant-test-fixture');
  });
}

async function injectCritiqueFixtureProvider(page: Page): Promise<void> {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as unknown;
  await page.evaluate((f) => {
    const llm = (window as unknown as Record<string, unknown>)['__llm'] as
      | {
          createMultiRoundFixtureProvider: (fixture: unknown) => unknown;
          setChatProviderOverride: (provider: unknown) => void;
        }
      | undefined;
    if (!llm) throw new Error('__llm seam not found on window');
    llm.setChatProviderOverride(llm.createMultiRoundFixtureProvider(f));
  }, fixture);
}

async function activateDiagramTab(page: Page, tab: DiagramTab): Promise<void> {
  await page.locator(`#diagram-tab-${tab.diagramId}`).click();
  await expect(page.locator(tab.signatureSelector).first()).toBeVisible({
    timeout: 10_000,
  });
}

interface StoredProject {
  readonly id: string;
  readonly elements: ReadonlyArray<Record<string, unknown>>;
  readonly edges: ReadonlyArray<Record<string, unknown>>;
}

async function readPersistedProject(
  page: Page,
  projectId: string,
): Promise<StoredProject | null> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as StoredProject;
    return {
      id: parsed.id,
      elements: parsed.elements ?? [],
      edges: parsed.edges ?? [],
    };
  }, projectId);
}

function canonicalize(
  list: ReadonlyArray<Record<string, unknown>>,
): ReadonlyArray<Record<string, unknown>> {
  // ownerIndex is a derived sibling-ordering hint, not a structural
  // property: the SysMLv2 text serializer emits in a canonical (kind+id
  // sorted) order, so re-imported elements get parse-order indices that
  // may differ from the pre-export indices even when the model is
  // structurally identical (same ids/kinds/ownerId/ownerRole). The
  // final-gate contract — like the Phase-12 gate — is "structurally
  // identical modulo IDs"; ordering hints fall outside that contract.
  // (Mirrors the canonicalize in phase-12-gate.spec.ts.)
  return [...list]
    .map((item) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item)) {
        if (v === undefined) continue;
        if (k === 'ownerIndex') continue;
        cleaned[k] = v;
      }
      return cleaned;
    })
    .sort((a, b) => String(a['id']).localeCompare(String(b['id'])));
}

test.describe('v1.0.0 final gate (issue #250) — full smoke + LLM critique + round-trip', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
    await injectApiKey(page);
    await page.reload();
  });

  test('walks 4 viewpoints, runs critique via recorded fixture, round-trips SysMLv2 with 5 traced requirements', async ({
    page,
  }) => {
    // Step 1 — every viewpoint renders its signature element.
    for (const tab of DIAGRAM_TABS) {
      await activateDiagramTab(page, tab);
    }

    // Step 2 — five requirement traces present in the persisted project
    // (confirms the seed shape before any UI interaction can mutate it).
    const preExport = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(preExport).not.toBeNull();
    const reqs = preExport!.elements.filter((e) => e['kind'] === 'Requirement');
    expect(reqs.length).toBeGreaterThanOrEqual(5);
    const traces = preExport!.edges.filter(
      (e) => e['kind'] === 'RequirementTrace',
    );
    expect(traces.length).toBeGreaterThanOrEqual(5);

    // Step 3 — run the LLM critique via the recorded fixture. The
    // `critique_model` tool is read-only, so the chat flow surfaces a
    // tool-use card and a tool-result card without any proposal.
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectCritiqueFixtureProvider(page);
    await page.getByTestId('chat-empty').locator('[data-testid="chat-new"]').click();
    await page.getByTestId('chat-composer').fill('Critique my model.');
    await page.getByTestId('chat-send').click();

    await expect(
      page.locator('[data-testid="tool-use-card"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    const toolResult = page.locator('[data-testid="tool-result-card"]').first();
    await expect(toolResult).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').last(),
    ).toContainText(/well-formed|no issues/i, { timeout: 15_000 });

    // Step 4 — back to a non-empty diagram so Export is enabled.
    await activateDiagramTab(page, DIAGRAM_TABS[0]!);

    // Step 5 — Export SysMLv2 and capture the downloaded text.
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-sysml').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.sysml$/);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const exportedText = readFileSync(tmpPath!, 'utf-8');
    expect(exportedText.length).toBeGreaterThan(200);
    expect(exportedText).toContain(`// id: ${SEED_PROJECT_ID}`);

    // Step 6 — Import the captured text back via the toolbar file
    // chooser, overwriting the seeded project (matching id in the
    // header sentinel).
    await page.getByTestId('toolbar-import').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('toolbar-import-sysml').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'final-gate.sysml',
      mimeType: 'text/plain',
      buffer: Buffer.from(exportedText, 'utf-8'),
    });

    await expect
      .poll(
        async () => {
          const proj = await readPersistedProject(page, SEED_PROJECT_ID);
          if (!proj) return -1;
          // Exclude the synthesized root Package (ownerId === null) when
          // counting, so the total reflects user elements only.
          const userElements = proj.elements.filter(
            (e) => (e as { ownerId?: unknown }).ownerId !== null,
          );
          return userElements.length + proj.edges.length;
        },
        { timeout: 15_000 },
      )
      .toBe(SEED_ELEMENTS.length + SEED_EDGES.length);

    // If the SysMLv2 importer surfaced a parse error, the storage stays
    // unchanged and the count-poll above trivially matches the still-
    // seeded data, masking the regression. Assert the error banner did
    // not appear during the import window so silent-fail imports can't
    // satisfy the gate.
    await expect(page.getByTestId('import-error-banner')).toBeHidden();

    // Step 7 — structural equality (modulo IDs is satisfied because
    // the serializer's `// id:` comments are the parser's ID-recovery
    // channel; positions are not part of the SysMLv2 round-trip
    // surface).
    // Compare post-import user elements against pre-export user elements:
    // both have been through the migration pipeline (ownerId/ownerRole/
    // ownerIndex set, legacy arrays stripped), so they should match exactly.
    const persisted = await readPersistedProject(page, SEED_PROJECT_ID);
    expect(persisted).not.toBeNull();
    const preExportUserElements = preExport!.elements.filter(
      (e) => (e as { ownerId?: unknown }).ownerId !== null,
    );
    const persistedUserElements = persisted!.elements.filter(
      (e) => (e as { ownerId?: unknown }).ownerId !== null,
    );
    const expectedEdges = canonicalize(
      SEED_EDGES as unknown as ReadonlyArray<Record<string, unknown>>,
    );
    expect(canonicalize(persistedUserElements)).toEqual(canonicalize(preExportUserElements));
    expect(canonicalize(persisted!.edges)).toEqual(expectedEdges);
  });
});
