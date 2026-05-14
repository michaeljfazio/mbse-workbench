#!/usr/bin/env node
/**
 * One-shot migration script for the ownerId/ownerRole/ownerIndex schema.
 * For each input file:
 *   1. Strip lines that set parent-side child arrays
 *      (memberIds | portIds | propertyIds | portUsageIds | parameterIds | portDefinitionIds): [...]
 *   2. For each element-literal `kind: '<KnownKind>'` (with or without `as const`),
 *      if the next ~15 lines (within the same nested block) don't already
 *      contain `ownerId:`, inject the owner trinity right after the `kind:` line,
 *      using the same indent.
 *
 * Idempotent and conservative — leaves a literal alone if it already carries
 * ownerId.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const KINDS = new Set([
  'Package', 'PartDefinition', 'PartUsage', 'PortDefinition', 'PortUsage',
  'InterfaceDefinition', 'ConnectionUsage', 'ItemFlow', 'Requirement',
  'ActionDefinition', 'ActionUsage', 'StateDefinition', 'StateUsage',
  'Transition', 'UseCase', 'Actor', 'ConstraintDefinition',
  'ConstraintUsage', 'ValueProperty',
]);

const PARENT_ARRAY_RE = /^\s*(memberIds|portIds|propertyIds|portUsageIds|parameterIds|portDefinitionIds)\s*:\s*\[[^\]]*\]\s*,?\s*$/;
const KIND_RE = /^(\s*)kind\s*:\s*'([A-Za-z]+)'(?:\s+as\s+const)?\s*,?\s*$/;

function migrate(src) {
  const lines = src.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PARENT_ARRAY_RE.test(line)) {
      continue;
    }

    out.push(line);

    const m = line.match(KIND_RE);
    if (m && KINDS.has(m[2])) {
      const indent = m[1];

      // Look ahead to find the close of this object literal (balanced braces)
      // OR a depth of 15 lines, whichever comes first. Check if ownerId
      // is present in that window. Track open/close braces starting from
      // the current line.
      let depth = 0;
      // Find the opening brace of this object literal — walk back up to
      // ~6 lines to find a `{` on its own (with nothing after it but
      // whitespace) or after `(` or `=`.
      // Simpler: scan ahead from i+1, counting balanced braces, allowing
      // arbitrary nesting; stop when depth returns to ≤ 0 OR after 50 lines.
      let hasOwnerId = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 50); j++) {
        const l = lines[j];
        if (/(^|\s)ownerId\s*:/.test(l)) {
          hasOwnerId = true;
          break;
        }
        // Cheap depth tracking
        for (const ch of l) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        if (depth < 0) break; // exited the literal
      }

      if (!hasOwnerId) {
        out.push(`${indent}ownerId: null,`);
        out.push(`${indent}ownerRole: 'member',`);
        out.push(`${indent}ownerIndex: 0,`);
      }
    }
  }

  return out.join('\n');
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node migrate-test-fixtures.mjs <file> [file …]');
  process.exit(2);
}
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const dst = migrate(src);
  if (src !== dst) {
    writeFileSync(file, dst);
    console.log(`migrated: ${file}`);
  } else {
    console.log(`unchanged: ${file}`);
  }
}
