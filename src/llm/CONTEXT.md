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
skips `tool_use` blocks — slice D/E will handle those.
