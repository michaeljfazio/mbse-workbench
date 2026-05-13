# LLM module — context for future slices

## Provider selection seam (`chat-provider.ts`)

`getChatProvider(apiKey)` is the single call-site that resolves which
`LLMProvider` implementation ChatPane uses at runtime.

In production it returns a live `AnthropicProvider`. In tests (unit or e2e)
call `setChatProviderOverride(provider)` **before** the component renders to
inject a `FixtureProvider` (or any other stub). Pass `null` to restore
production behaviour.

### E2E injection pattern

Playwright injects the override via `page.evaluate` before navigating or
interacting with the Chat tab:

```ts
import fixtureJson from '../fixtures/llm/no-tool-greeting.json';

await page.evaluate((fixture) => {
  const { createFixtureProvider, setChatProviderOverride } =
    (window as unknown as Record<string, unknown>) as {
      createFixtureProvider: (f: unknown) => unknown;
      setChatProviderOverride: (p: unknown) => void;
    };
  setChatProviderOverride(createFixtureProvider(fixture));
}, fixtureJson);
```

The app exposes `setChatProviderOverride` and `createFixtureProvider` on
`window.__llm` (see `src/main.tsx` dev-mode seam). The e2e spec
`tests/e2e/chat-streaming.spec.ts` demonstrates the full pattern.

## Pure reducer (`conversation-reducer.ts`)

`appendUserText`, `appendAssistantTextDelta`, `finalizeAssistantMessage` are
pure functions with no React/store dependencies. The store delegates to them;
unit tests exercise them in isolation.

## Stream accumulator (`stream-accumulator.ts`)

`accumulateStream(events, onTextDelta, onStop)` is a pure async function that
consumes an `AsyncIterable<LLMEvent>` and fires callbacks. It deliberately
skips `tool_use` blocks — handled by the dispatcher.

## Tool dispatcher and registry (slice D, issue #220)

- **Zod version:** `~3.23.0` pinned in `package.json` (resolves to 3.23.8).
  Used only in `src/llm/tools/` for schema definitions and input parsing.
  Do not import zod elsewhere in the codebase.

- **How to add a new tool:**
  1. Create `src/llm/tools/my-tool.ts` exporting `myToolDefinition: LLMToolDefinition`,
     `myToolSchema: z.ZodType`, and `myToolHandler(input, ctx, reader): Promise<ToolOutput>`.
  2. Register it in `src/llm/tools/index.ts` `buildToolRegistry`.
  3. Write unit tests in `tests/unit/llm/tools/my-tool.test.ts` using
     `createProjectReader` with an in-memory fixture — never mock the model.
  4. Add a round-trip fixture to `tests/fixtures/llm/` for e2e coverage.

- **ProjectReader injection pattern:** Tool handlers receive a `ProjectReader`
  (defined in `src/llm/project-reader.ts`) instead of importing the Zustand
  store. The reader is a snapshot built at dispatch time by `ChatPane`'s
  `handleSend`. This keeps handlers pure and testable without a browser
  environment.

- **Multi-round fixture:** Use `createMultiRoundFixtureProvider(fixture)` (exposed
  on `window.__llm`) for e2e tests that need to simulate a tool round-trip.
  The fixture JSON has `responseRounds: AnthropicRawStreamEvent[][]` instead of
  `responses: AnthropicRawStreamEvent[]`. Each `stream()` call consumes the
  next round; the last round is replayed if calls exceed the array length.

- **appendRawMessage store action:** Added to `WorkspaceStore` to persist
  `tool_use` and `tool_result` content blocks in the conversation. The original
  `appendAssistantText` only handles text deltas and cannot persist structured
  blocks. ChatPane calls `appendRawMessage` for every message returned by the
  dispatcher except the first (user message already appended separately).

- **ToolCallCard a11y:** `text-xs` (12px) requires 4.5:1 contrast ratio (WCAG AA
  normal text rule). `text-muted-foreground` (#64748b) on `bg-muted/50` (#f1f5f9)
  only achieves 4.34:1 — use `text-foreground` for all visible text in collapsed
  ToolCallCard buttons.
