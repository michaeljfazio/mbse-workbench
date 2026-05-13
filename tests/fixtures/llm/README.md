# LLM fixtures

Recorded request/response pairs used by the Phase 11 LLM dispatcher tests.
Real API calls are mocked at the SDK boundary by replaying these fixtures
through `createFixtureProvider` (see `src/llm/fixture.ts`).

## Format

Each fixture is a JSON file shaped:

```jsonc
{
  "name": "no-tool-greeting",
  "request": {
    "model": "claude-sonnet-4-6",
    "system": "...",
    "messages": [{ "role": "user", "content": "..." }],
    "tools": []
  },
  "responses": [
    // Raw Anthropic SDK streaming events, replayed in order. The
    // FixtureProvider translates these into our internal `LLMEvent`
    // stream via `translateAnthropicEvents` — the same translator
    // AnthropicProvider uses against real SDK streams, so test
    // recordings exercise the production translation path.
    { "type": "message_start", "message": { "id": "msg_..." } },
    { "type": "content_block_start", "index": 0, "content_block": { "type": "text", "text": "" } },
    { "type": "content_block_delta", "index": 0, "delta": { "type": "text_delta", "text": "Hi" } },
    { "type": "content_block_stop", "index": 0 },
    { "type": "message_delta", "delta": { "stop_reason": "end_turn" } },
    { "type": "message_stop" }
  ]
}
```

Supported event types are enumerated by `AnthropicRawStreamEvent` in
`src/llm/stream-translate.ts`. Tool-use streams use
`content_block_start` with `content_block.type === "tool_use"` followed
by `input_json_delta` chunks accumulating the JSON input.

See `no-tool-greeting.json` for a minimal worked example.
