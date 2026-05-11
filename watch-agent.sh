#!/usr/bin/env bash
# watch-agent.sh — pretty-printed live feed of the agent's real-time activity.
#
# Tails agent-trace.jsonl (produced by run-agent.sh in stream-json mode) and
# renders each event as a human-readable line. Run this in a separate terminal
# while the Ralph loop is going to see the agent's thinking, tool calls, and
# results as they happen.
#
# Usage:
#   ./watch-agent.sh                          # tails agent-trace.jsonl in cwd
#   ./watch-agent.sh path/to/agent-trace.jsonl
#
# Output legend:
#   ── iteration <n> start | end (runner-level boundary marker)
#   ◇  session init        (model + session id)
#   🧠 thinking            (extended-thinking content, truncated)
#   💬 assistant           (text said by the agent)
#   🔧 tool                (tool call: name + args summary)
#   ✓  result              (tool result, truncated)
#   ✗  error               (tool error)
#   ⏹  session end         (per-iteration final result)

set -euo pipefail

TRACE="${1:-agent-trace.jsonl}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install with: brew install jq" >&2
  exit 1
fi

if [[ ! -f "$TRACE" ]]; then
  echo "Waiting for $TRACE to be created..." >&2
  while [[ ! -f "$TRACE" ]]; do sleep 1; done
fi

echo "Watching $TRACE — Ctrl-C to stop." >&2
echo "" >&2

tail -n +1 -F "$TRACE" 2>/dev/null | while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  echo "$line" | jq -r '
    def trim($n): if (. // "" | tostring | length) > $n then ((. | tostring)[0:$n] + "…") else (. | tostring) end;
    def ts: (.timestamp // "" | .[11:19]);

    # Runner-emitted boundary markers
    if .type == "runner" then
      if .event == "iteration_start" then
        "\n── iteration \(.iteration) start  (\(ts))\n"
      elif .event == "iteration_end" then
        "── iteration \(.iteration) end    (rc=\(.rc), \(ts))\n"
      else empty end

    # Claude session events
    elif .type == "system" and .subtype == "init" then
      "◇  session init  model=\(.model // "?")  session=\(.session_id // "?" | .[0:8])"

    elif .type == "assistant" then
      (.message.content // []) | map(
        if .type == "thinking" then
          "🧠 " + ((.thinking // "") | trim(280))
        elif .type == "text" then
          "💬 " + ((.text // "") | trim(280))
        elif .type == "tool_use" then
          "🔧 " + (.name // "?") + "  " + ((.input // {}) | tostring | trim(200))
        else empty end
      ) | .[]

    elif .type == "user" then
      (.message.content // []) | map(
        if .type == "tool_result" then
          (if .is_error then "✗  " else "✓  " end) +
          ((.content // "" |
            if type == "array" then map(.text // (. | tostring)) | join(" ") else (. | tostring) end
          ) | trim(220))
        else empty end
      ) | .[]

    elif .type == "result" then
      "⏹  session end  subtype=\(.subtype // "?")  duration_ms=\(.duration_ms // "?")  cost_usd=\(.total_cost_usd // .cost_usd // "?")\n"

    else empty end
  ' 2>/dev/null
done
