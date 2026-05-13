# 0010 — LLM architecture: provider, dispatcher, tool registry, diff-preview seam

Date: 2026-05-13 · Status: accepted · Phase: 11 · Issue: #216

## Context

Phase 11 adds an in-app LLM assistant that can read the model and propose
edits. Six seams must be pinned before slices #217–#222 land code: how the
SDK is abstracted, how the multi-turn tool-use loop runs, how tools are
declared and dispatched, how mutations stay reversible, where conversations
live, and how the API key is handled in a browser-only app. Anchors: the
typed `Command` union in `src/commands/types.ts`, `Project` in
`src/repository/types.ts`, the schema-tolerant `readProject` in
`src/repository/sessionStorage.ts`, and the verified
`@anthropic-ai/sdk@~0.32.1` streaming shape recorded in `docs/CONTEXT.md`
iter-235 (~L1034).

## Decision

1. **Provider interface.** `LLMProvider.stream(req): AsyncIterable<LLMEvent>`
   where `req = { system, messages, tools, maxTokens }` and `LLMEvent` is a
   discriminated union over `{ kind: 'content_block_start' | 'text_delta' |
   'input_json_delta' | 'content_block_stop' | 'message_stop', ... }`. Two
   impls land in phase 11: `AnthropicProvider` (real, constructed with
   `dangerouslyAllowBrowser: true`) and `FixtureProvider` (replays
   `tests/fixtures/llm/*.json`). Tests pin against the interface; the real
   provider is never instantiated in tests.

2. **Dispatcher loop.** Per CONTEXT iter-235: consume events, append each
   `input_json_delta.partial_json` into a buffer keyed by `content_block_index`,
   `JSON.parse` at `content_block_stop`, finalise the assistant message at
   `message_stop`. If `stop_reason === 'tool_use'`, resolve each `tool_use`
   block against the registry, await its handler, append a user message
   whose content contains matching `tool_result` blocks, recurse. Hard cap:
   **8 round-trips per user turn**, then abort with a synthetic assistant
   note. Handler throw → `tool_result` with `is_error: true` and
   `String(err)`; the loop continues so the model can recover.

3. **Tool registry.** `Map<string, ToolEntry>` keyed by tool `name`. Each
   entry: an Anthropic `Tool` definition (snake_case `input_schema`), a Zod
   schema mirroring it for runtime input validation, a handler
   `(input, ctx) => Promise<ToolOutput>`, and a `mutating: boolean` flag.
   Read-only tools return data directly. Mutating tools return a
   `ProposedChange` and never touch the model themselves.

4. **Diff-preview seam.** `ProposedChange = { id, summary, commands:
   Command[] }` reusing the existing typed command union. The chat sidebar
   renders a diff card; on accept the commands flow through the existing
   command bus (undo/redo unchanged) and a `tool_result` reports applied
   entity IDs; on reject a `tool_result` with `is_error: false` carries a
   rejection note so the model can react. Mutating tool handlers never
   mutate state — only the accept path does.

5. **Conversation persistence.** Extend `Project` with `conversations:
   readonly Conversation[]`. Chosen because it reuses
   `InMemorySessionRepository` save/load and keeps chat outside the
   command-bus history (chat edits must not pollute undo/redo). Rejected:
   sibling `ConversationStore` — duplicates persistence wiring without
   benefit. `readProject` will default the field to `[]` when missing,
   following the existing `diagrams`/`history` forward-compat pattern.

6. **API key handling.** First chat use opens a modal; key stored in
   `sessionStorage` under `mbse-workbench:anthropic-api-key`; cleared on
   tab close (sessionStorage semantics). Never logged, telemetered, or
   committed. A header chip shows present/absent. `AnthropicProvider` reads
   the key at construction; replacing the key constructs a new provider.

## Consequences

- Tool handler bodies (slices D/E), chat UI (C), and diff-preview UI (E)
  are out of scope here; this ADR only fixes their seams.
- `FixtureProvider` lets the dispatcher, registry, and diff seam be tested
  deterministically without network or key.
- Adding `conversations` to `Project` bumps the persisted shape; the
  schema-tolerant `readProject` absorbs old sessions.
- `sessionStorage` semantics mean the key never survives a tab close —
  accepted UX cost for not persisting secrets in a browser-only app.
