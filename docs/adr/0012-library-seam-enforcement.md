# 0012 — Library seam enforcement: command-bus pre-apply guard + onError surface

**Status:** Accepted (2026-05-16, iter-782)
**Issue:** #345 (T-14.02, depends on T-14.01 / ADR 0011)

## Context

T-14.01 (commit 2cfc23f) landed the schema:
`PackageElement.isReadOnly?: boolean` and
`Project.libraryRootIds?: readonly ElementId[]`. Without enforcement,
those fields are comments. Phase 14 will load KerML/SysML standard-library
content into `libraryRootIds` (T-14.04); the explorer will surface them
with a lock badge (T-14.03). Both require that destructive operations
against any element in a read-only subtree be rejected — otherwise a
single UI gesture could corrupt vendored library content with no recovery
path (sessionStorage-backed repository; no transaction log beyond the
event log).

## Decision

1. **The guard lives in the command bus, not per-command.** A single
   `checkLibraryGuard(command)` function runs after `checkPermissions`
   and before `applyAndInvert`. Per-command enforcement would scatter
   the same ancestor-walk across nine apply paths and silently miss any
   future command added without a code review catching the omission.

2. **Pre-apply, not post-apply rollback.** The bus must throw before
   any registry mutation. Post-apply rollback would require either (a)
   the bus to know how to invert every command — which it already does,
   but invoking it on every rejection burns work — or (b) a transaction
   primitive on the registry. Neither carries its weight when the guard
   is a constant-time predicate at the command boundary.

3. **`LibraryViolationError` is a typed Error**, parallel to the existing
   `PermissionDeniedError`. It carries the offending `Command` and the
   `ElementId` of the read-only ancestor that triggered the rejection.
   It is thrown synchronously from `dispatch()`; the call site receives
   the exception just like a permission denial.

4. **Destructive command set is explicitly enumerated.** `DESTRUCTIVE_COMMAND_KINDS`
   in `src/commands/bus.ts` lists the six mutating kinds. `EXEMPT_COMMAND_KINDS`
   lists `update-diagram-position` (presentation) and `compound` (gateway).
   `src/commands/__tests__/destructiveCoverage.test.ts` asserts the union
   covers every `CommandKind` exactly once. Adding a new mutating command
   without classifying it fails CI.

5. **Compound commands are validated atomically.** `checkLibraryGuard`
   recurses into every subcommand of a compound before any apply runs.
   A compound with one violating subcommand rejects the whole compound;
   no subcommand applies. Mirrors the existing `checkPermissions`
   behavior.

6. **The `onError` callback option surfaces rejections to the UI.** The
   workspace has 60+ `bus.dispatch` sites; wrapping each in try/catch
   would be invasive churn. Instead the bus accepts an
   `onError?: (err, command) => void` option; the workspace bootstrap
   wires it to set `commandError` on the store. The error is still
   re-thrown to the original call site for any local handling. There is
   no toast primitive in this codebase today; the new `CommandErrorBanner`
   mirrors the existing `ImportErrorBanner` shape, not a new UI primitive.

## Consequences

- `commandError: { message: string } | null` joins `importError` on the
  workspace state. A future PR can converge these onto a unified
  notification surface; the field shape is intentionally minimal so the
  migration is local.
- An edge whose endpoint is in a read-only subtree is itself read-only
  for `unlink` and `update-edge`. This matches the SysMLv2 intuition
  that "an edge whose target you can't modify is also frozen."
- `Package.isReadOnly === true` is a closed-world commitment: any
  attempt to add new children or rename/delete existing children fails.
  T-14.04 (vendor KerML) will rely on this to keep the standard library
  invariant under user edits.
- Root-level creates (`ownerId === null`) are never guarded — a
  read-only Package cannot be the project root, by construction.
