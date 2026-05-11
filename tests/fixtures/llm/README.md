# LLM fixtures

Recorded request/response pairs used by the Phase 11 LLM dispatcher tests.
Real API calls are mocked at the SDK boundary by replaying these fixtures.

## Format

Each fixture is a JSON file shaped:

```jsonc
{
  "name": "explain-bdd-diagram",
  "request": {
    "model": "claude-...",
    "system": "...",
    "messages": [{ "role": "user", "content": "..." }],
    "tools": [/* tool defs */]
  },
  "responses": [
    // ordered list of streaming events, replayed verbatim
    { "type": "message_start", "message": { /* ... */ } },
    { "type": "content_block_start", "index": 0, "content_block": { /* ... */ } },
    { "type": "content_block_delta", "index": 0, "delta": { /* ... */ } },
    { "type": "message_stop" }
  ]
}
```

Phase 11 lands the loader and the dispatcher; this README is the template
that phase reads.
