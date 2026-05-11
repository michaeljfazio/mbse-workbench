import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-0');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const response = await page.goto('https://michaeljfazio.github.io/mbse-workbench/', {
  waitUntil: 'networkidle',
});
if (!response || response.status() !== 200) {
  throw new Error(`Unexpected status ${response?.status()}`);
}
await page.waitForSelector('text=MBSE Workbench');
await page.screenshot({ path: resolve(outDir, 'app-shell.png'), fullPage: true });

console.log(JSON.stringify({
  url: page.url(),
  title: await page.title(),
  status: response.status(),
}, null, 2));

await browser.close();
