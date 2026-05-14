import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T-13.16 — guard the design tokens that make `bg-card` and
// `text-card-foreground` resolve to non-transparent colors. 95 call sites
// across viewpoints and popovers depend on these. If they regress (token
// missing from index.css OR `card` color missing from tailwind.config.ts),
// every node body and every popover renders fully transparent.

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('card design tokens (T-13.16)', () => {
  it('index.css defines --card and --card-foreground in :root and .dark', () => {
    const css = read('src/index.css');
    const root = css.match(/:root\s*\{([\s\S]*?)\}/);
    const dark = css.match(/\.dark\s*\{([\s\S]*?)\}/);
    expect(root, ':root block must exist in src/index.css').not.toBeNull();
    expect(dark, '.dark block must exist in src/index.css').not.toBeNull();
    expect(root![1]).toMatch(/--card:\s*[^;]+;/);
    expect(root![1]).toMatch(/--card-foreground:\s*[^;]+;/);
    expect(dark![1]).toMatch(/--card:\s*[^;]+;/);
    expect(dark![1]).toMatch(/--card-foreground:\s*[^;]+;/);
  });

  it('tailwind.config.ts wires the `card` color to the CSS variables', () => {
    const cfg = read('tailwind.config.ts');
    expect(cfg).toMatch(/card:\s*\{[\s\S]*?DEFAULT:\s*'hsl\(var\(--card\)\)'/);
    expect(cfg).toMatch(/foreground:\s*'hsl\(var\(--card-foreground\)\)'/);
  });
});
