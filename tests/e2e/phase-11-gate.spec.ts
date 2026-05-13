import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Phase 11 gate spec (issue #222). One Playwright e2e using a recorded
// fixture response file to drive a full UI flow without hitting the real
// API, per AGENT.md.
//
// Fixture flow (4 rounds):
//   1. streamed assistant text → tool_use `explain_diagram` (read-only)
//   2. streamed text → tool_use `create_element` (mutating, accept)
//   3. streamed text → tool_use `link_requirement` (mutating, accept)
//   4. final streamed text → end_turn

const SEED_PROJECT_ID = 'p-phase-11-gate';
const BDD_DIAGRAM = 'd-bdd';
const REQ_DIAGRAM = 'd-requirements';
const VESSEL_ID = 'el-vessel';
const MISSION_ID = 'el-mission';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'tests/fixtures/llm/phase-11-gate-full-flow.json',
);

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, bddId, reqId, vesselId, missionId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 11 Gate Seed',
        createdAt: '2026-05-14T10:00:00.000Z',
        modifiedAt: '2026-05-14T10:00:00.000Z',
        elements: [
          {
            id: vesselId,
            kind: 'PartDefinition',
            name: 'Vessel',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
          {
            id: missionId,
            kind: 'Requirement',
            name: 'Mission',
            text: 'The system shall complete its mission.',
            priority: 'medium',
            status: 'approved',
          },
        ],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: { [vesselId]: { x: 120, y: 120 } },
          },
          {
            id: reqId,
            viewpointId: 'requirements',
            name: 'System Requirements',
            positions: { [missionId]: { x: 120, y: 120 } },
          },
        ],
        history: { undo: [], redo: [] },
        conversations: [],
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_DIAGRAM,
      reqId: REQ_DIAGRAM,
      vesselId: VESSEL_ID,
      missionId: MISSION_ID,
    },
  );
}

function loadFixtureJson(): unknown {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8');
  const substituted = raw
    .replace(/__REQ_ID__/g, MISSION_ID)
    .replace(/__TARGET_ID__/g, VESSEL_ID);
  return JSON.parse(substituted);
}

async function injectApiKey(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('mbse-workbench:anthropic-api-key', 'sk-ant-test-fixture');
  });
}

async function injectMultiRoundFixtureProvider(page: Page): Promise<void> {
  const fixture = loadFixtureJson();
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

async function readEdgeCount(page: Page): Promise<number> {
  return await page.evaluate((projectId) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${projectId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { edges?: unknown[] };
    return Array.isArray(parsed.edges) ? parsed.edges.length : 0;
  }, SEED_PROJECT_ID);
}

async function readPumpExists(page: Page): Promise<boolean> {
  return await page.evaluate((projectId) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${projectId}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      elements?: ReadonlyArray<{ kind?: string; name?: string }>;
    };
    return (parsed.elements ?? []).some(
      (e) => e.kind === 'PartDefinition' && e.name === 'Pump',
    );
  }, SEED_PROJECT_ID);
}

test.describe('Phase 11 gate (issue #222) — full LLM UI flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await injectApiKey(page);
    await page.reload();
  });

  test('streamed text + read-only tool + create_element accept + link_requirement accept + undo', async ({
    page,
  }) => {
    // Step 1 — open chat and arm the multi-round fixture provider.
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);
    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page
      .getByTestId('chat-composer')
      .fill(
        'Inspect the diagram, add a Pump part, then satisfy Mission with Vessel.',
      );
    await page.getByTestId('chat-send').click();

    // Round 2 — create_element proposal card appears. (The round-1
    // `explain_diagram` tool-use card is asserted after the full
    // dispatch resolves; ChatPane persists assistant messages to the
    // conversation only when the dispatcher promise settles — see
    // docs/CONTEXT.md "ChatPane streaming semantics".)
    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(firstProposal).toBeVisible({ timeout: 15000 });
    await expect(firstProposal.locator('[data-testid="proposal-summary"]')).toContainText(
      'Create PartDefinition "Pump"',
    );

    // Accept create_element. Don't assert proposal count=0 here — the
    // dispatcher resumes into round 3 and surfaces the link_requirement
    // proposal before the queue can ever be empty.
    await firstProposal.locator('[data-testid="proposal-accept"]').click();

    // Pump now exists in the project tree.
    await expect(
      page
        .locator('[data-testid="project-tree"] [role="treeitem"]', { hasText: 'Pump' })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    expect(await readPumpExists(page)).toBe(true);

    // Round 3 — link_requirement proposal card appears. Wait until the
    // visible proposal summary matches link_requirement before
    // accepting; first() may briefly still resolve to the just-accepted
    // create_element card during teardown of the previous round.
    const linkProposal = page.locator('[data-testid="proposal-card"]', {
      hasText: 'Link requirement',
    }).first();
    await expect(linkProposal).toBeVisible({ timeout: 15000 });
    await expect(linkProposal.locator('[data-testid="proposal-summary"]')).toContainText(
      'Link requirement "Mission" --satisfy--> "Vessel"',
    );

    // Edge count is still zero before accept.
    expect(await readEdgeCount(page)).toBe(0);

    // Accept link_requirement.
    await linkProposal.locator('[data-testid="proposal-accept"]').click();

    // One requirement-trace edge now exists.
    await expect.poll(() => readEdgeCount(page)).toBe(1);

    // Round 4 — final assistant text. The dispatcher resolves here,
    // and ChatPane now appends all intermediate assistant messages
    // (including round-1 text + explain_diagram tool_use + tool_result)
    // to the conversation in one go.
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });
    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').last(),
    ).toContainText('Pump is now in the model');

    // Round 1 read-only tool round-trip is now visible: explain_diagram
    // tool-use card + matching tool-result card.
    await expect(
      page.locator('[data-testid="tool-use-card"][data-tool-name="explain_diagram"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="tool-result-card"][data-tool-use-id="tu_explain_1"]'),
    ).toBeVisible({ timeout: 15000 });

    // Cmd-Z reverts the last batch (link_requirement) atomically. The Pump
    // from the previous batch must survive. Blur first so the workspace
    // keydown handler doesn't skip the event as a text-input target.
    await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    });
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect.poll(() => readEdgeCount(page)).toBe(0);
    expect(await readPumpExists(page)).toBe(true);
  });

  test('@a11y workspace post-flow has no serious accessibility violations', async ({
    page,
  }) => {
    // Drive the same flow but Accept both proposals so the workspace ends
    // in its final post-flow state, then scan.
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);
    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page.getByTestId('chat-composer').fill('Drive the gate.');
    await page.getByTestId('chat-send').click();

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(firstProposal).toBeVisible({ timeout: 15000 });
    await firstProposal.locator('[data-testid="proposal-accept"]').click();

    const linkProposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(linkProposal).toBeVisible({ timeout: 15000 });
    await linkProposal.locator('[data-testid="proposal-accept"]').click();

    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);
    await expect.poll(() => readEdgeCount(page)).toBe(1);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="workspace"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    // Pre-existing `text-muted-foreground` contrast violation on the
    // inactive sidebar tab button is tracked separately (slice C) — exclude
    // that single class of violations to keep the gate clean.
    const filtered = blocking.filter(
      (v) => v.id !== 'color-contrast' || !JSON.stringify(v.nodes).includes('text-muted-foreground'),
    );
    expect(filtered, JSON.stringify(filtered, null, 2)).toEqual([]);
  });

  test('@visual workspace end-state after full flow', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);
    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page.getByTestId('chat-composer').fill('Drive the gate.');
    await page.getByTestId('chat-send').click();

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(firstProposal).toBeVisible({ timeout: 15000 });
    await firstProposal.locator('[data-testid="proposal-accept"]').click();

    const linkProposal = page.locator('[data-testid="proposal-card"]').first();
    await expect(linkProposal).toBeVisible({ timeout: 15000 });
    await linkProposal.locator('[data-testid="proposal-accept"]').click();

    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);
    await expect.poll(() => readEdgeCount(page)).toBe(1);
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });
    // Wait for the dispatcher's final assistant text to be present — without
    // this, the snapshot can fire between the last `proposal-card` clearing
    // and the round-4 messages being appended (ChatPane appends only at
    // dispatcher resolution; see docs/CONTEXT.md "ChatPane streaming
    // semantics"). The fixture's final text is deterministic.
    await expect(
      page.getByText('Pump is now in the model and Mission satisfies Vessel.'),
    ).toBeVisible({ timeout: 15000 });

    // Stabilise for visual diff:
    //   1. Blur focus so the Send button (and any focus ring) is in its
    //      idle state across runs.
    //   2. Pin the scrollback to top so the auto-scroll-to-bottom
    //      useEffect's sub-pixel landing position doesn't shift every text
    //      row by ~1px between captures.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      const sb = document.querySelector(
        '[data-testid="chat-scrollback"]',
      ) as HTMLElement | null;
      if (sb) sb.scrollTop = 0;
    });
    // Scope the snapshot to the scrollback — excludes the composer's Send
    // button (its disabled-vs-idle pixel state varies) and the header tab
    // strip; the scroll position is now deterministic.
    await expect(page.getByTestId('chat-scrollback')).toHaveScreenshot(
      'phase-11-final-chat.png',
    );
  });
});
