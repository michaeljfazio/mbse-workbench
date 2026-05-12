import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-6');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-6';
const BDD_DIAGRAM = 'd-bdd';
const SM_DIAGRAM = 'd-state-machine';

const INITIAL = 's-initial';
const IDLE = 's-idle';
const RUNNING = 's-running';
const STOPPED = 's-stopped';
const FINAL = 's-final';

const T_BOOT = 't-boot';
const T_START = 't-start';
const T_STOP = 't-stop';
const T_SHUTDOWN = 't-shutdown';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-6 Smoke',
  createdAt: '2026-05-12T10:00:00.000Z',
  modifiedAt: '2026-05-12T10:05:00.000Z',
  elements: [
    { id: INITIAL, kind: 'StateUsage', name: '', stateType: 'initial' },
    {
      id: IDLE,
      kind: 'StateUsage',
      name: 'Idle',
      stateType: 'state',
      entryAction: 'log("idle")',
      doAction: 'tick()',
      exitAction: 'cleanup()',
    },
    { id: RUNNING, kind: 'StateUsage', name: 'Running', stateType: 'state' },
    { id: STOPPED, kind: 'StateUsage', name: 'Stopped', stateType: 'state' },
    { id: FINAL, kind: 'StateUsage', name: '', stateType: 'final' },
    {
      id: T_BOOT,
      kind: 'Transition',
      name: 'Transition1',
      sourceId: INITIAL,
      targetId: IDLE,
    },
    {
      id: T_START,
      kind: 'Transition',
      name: 'Transition2',
      sourceId: IDLE,
      targetId: RUNNING,
      trigger: 'start',
      guard: 'ready',
      effect: 'log()',
    },
    {
      id: T_STOP,
      kind: 'Transition',
      name: 'Transition3',
      sourceId: RUNNING,
      targetId: STOPPED,
    },
    {
      id: T_SHUTDOWN,
      kind: 'Transition',
      name: 'Transition4',
      sourceId: STOPPED,
      targetId: FINAL,
    },
  ],
  edges: [],
  diagrams: [
    {
      id: BDD_DIAGRAM,
      viewpointId: 'bdd',
      name: 'Main BDD',
      positions: {},
    },
    {
      id: SM_DIAGRAM,
      viewpointId: 'state-machine',
      name: 'Lifecycle',
      positions: {
        [INITIAL]: { x: 220, y: 30 },
        [IDLE]: { x: 200, y: 100 },
        [RUNNING]: { x: 200, y: 220 },
        [STOPPED]: { x: 200, y: 340 },
        [FINAL]: { x: 220, y: 460 },
      },
    },
  ],
  history: { undo: [], redo: [] },
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript((args) => {
  const key = `mbse:v1:project:${args.id}`;
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, JSON.stringify(args.seed));
  }
}, { id: SEED_PROJECT_ID, seed });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`[browser-error] ${msg.text()}`);
});

console.log('1/4 — visit shell');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="canvas-toolbar"]');
await page.screenshot({ path: `${outDir}/01-shell.png`, fullPage: false });

console.log('2/4 — State Machine tab with seeded states + 4 Transitions');
await page.getByRole('tab', { name: 'Lifecycle' }).click();
await page.waitForSelector('[data-state-node-type="initial"]');
await page.waitForSelector('[data-state-node-type="final"]');
await page.waitForSelector(`[data-testid="state-machine-state-${IDLE}"]`);
await page.waitForSelector('[data-testid^="state-machine-edge-"]');
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-state-machine-graph.png`, fullPage: false });

console.log('3/4 — inspector on Idle (entry/do/exit fields populated)');
await page.getByTestId(`project-tree-leaf-${IDLE}`).click();
await page.getByTestId('inspector-state').waitFor({ state: 'visible' });
await page.screenshot({ path: `${outDir}/03-inspector-state-idle.png`, fullPage: false });

console.log('4/4 — inspector on Idle→Running transition (trigger/guard/effect)');
await page.getByTestId(`project-tree-leaf-${T_START}`).click();
await page
  .getByTestId('inspector-transition')
  .waitFor({ state: 'visible', timeout: 5000 })
  .catch(() => {});
await page.screenshot({ path: `${outDir}/04-inspector-transition.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
