#!/usr/bin/env bash
# watch-agent.sh — pretty-printed live feed of the autonomous agent's activity.
#
# Tails agent-trace.jsonl (produced by run-agent.sh in stream-json mode) and
# renders each event in a colour-coded, console-friendly form. Run this in a
# separate terminal — or via `just watch` — while the loop is going to see
# thinking, tool calls, results, and iteration boundaries as they happen.
#
# Usage:
#   ./watch-agent.sh                          # tails agent-trace.jsonl in cwd
#   ./watch-agent.sh path/to/trace.jsonl
#   NO_COLOR=1 ./watch-agent.sh               # disable ANSI colour
#
# Legend:
#   ── iter N start/end       runner-level boundary (bold magenta)
#   ◇  session init           model + session id (blue)
#   🧠 thinking                extended-thinking content (dim grey)
#   💬 assistant text          visible message from the agent (cyan)
#   🔧 tool                    tool call: name + condensed args (yellow)
#   ✓  result                  tool result, truncated (green)
#   ✗  error                   tool error (red)
#   ⏹  session end             per-iteration final result + cost (blue)

set -euo pipefail

TRACE="${1:-agent-trace.jsonl}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install with: brew install jq" >&2
  exit 1
fi

# Disable ANSI colour when piping or when NO_COLOR is set.
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  COLOR=1
else
  COLOR=0
fi

if [[ ! -f "$TRACE" ]]; then
  echo "Waiting for $TRACE to be created..." >&2
  while [[ ! -f "$TRACE" ]]; do sleep 1; done
fi

if [[ "$COLOR" == 1 ]]; then
  printf '\033[1mWatching\033[0m %s — Ctrl-C to stop.\n' "$TRACE" >&2
else
  printf 'Watching %s — Ctrl-C to stop.\n' "$TRACE" >&2
fi
printf '%s\n' "----------------------------------------------------------------------" >&2

# Single streaming jq filter. ANSI escape sequences are introduced as
# string concatenation so they can be turned off when COLOR=0.
tail -n +1 -F "$TRACE" 2>/dev/null | jq -r --argjson color "$COLOR" '
  # ----- ANSI helpers (string-returning so they can no-op via $color) ----
  def reset:   if $color == 1 then "[0m"  else "" end;
  def bold:    if $color == 1 then "[1m"  else "" end;
  def dim:     if $color == 1 then "[2m"  else "" end;
  def red:     if $color == 1 then "[31m" else "" end;
  def green:   if $color == 1 then "[32m" else "" end;
  def yellow:  if $color == 1 then "[33m" else "" end;
  def blue:    if $color == 1 then "[34m" else "" end;
  def magenta: if $color == 1 then "[35m" else "" end;
  def cyan:    if $color == 1 then "[36m" else "" end;

  # ----- formatting helpers ---------------------------------------------
  # HH:MM:SS slice of an ISO-8601 timestamp.
  def ts: (.timestamp // "" | tostring | .[11:19]);

  # Truncate-with-ellipsis at character boundary $n.
  def trim($n):
    (. // "" | tostring) as $s
    | if ($s | length) > $n
      then ($s[0:$n] + "…")
      else $s
      end;

  # Collapse internal whitespace to a single space and trim ends. Multi-line
  # thinking blocks become one line that still hints at the structure.
  def squish:
    (. // "" | tostring)
    | gsub("[\r\n]+"; " ⏎ ")
    | gsub("\\s+"; " ")
    | sub("^\\s+"; "")
    | sub("\\s+$"; "");

  # Render a tool_use input as a short, human-readable summary. Pulls the
  # most informative single field for common tools; falls back to compact
  # JSON for everything else.
  def tool_summary(name; input):
    if name == "Read" then
      (input.file_path // "?") +
        (if input.offset then "  @\(input.offset)" else "" end)
    elif name == "Write" then
      (input.file_path // "?")
    elif name == "Edit" then
      (input.file_path // "?") +
        (if input.replace_all then "  (all)" else "" end)
    elif name == "Bash" then
      (input.description // input.command // "?" | squish | trim(140))
    elif name == "Grep" then
      "/" + (input.pattern // "?") + "/ in " + (input.path // ".") +
        (if input.glob then "  glob=\(input.glob)" else "" end)
    elif name == "Glob" then
      (input.pattern // "?") +
        (if input.path then "  in \(input.path)" else "" end)
    elif name == "WebFetch" then
      (input.url // "?")
    elif name == "WebSearch" then
      (input.query // "?" | trim(120))
    elif name == "TodoWrite" then
      "\((input.todos // []) | length) todos"
    elif name == "Task" then
      (input.description // input.subagent_type // "?" | squish | trim(140))
    elif (name | tostring | test("^mcp__")) then
      ([input | to_entries[]?.value | tostring] | join("  ") | squish | trim(140))
    else
      (input | tostring | squish | trim(140))
    end;

  # Render tool_result content (string or content-block array) as one
  # truncated line.
  def result_text:
    (.content // "")
    | if type == "array"
      then (map(.text // (. | tostring)) | join(" "))
      else (. | tostring)
      end
    | squish
    | trim(220);

  # ----- main dispatch --------------------------------------------------

  if .type == "runner" then
    if .event == "iteration_start" then
      "\n" + bold + magenta +
        "── iter \(.iteration) start " +
        "─────────────────────────────────────────────" +
        reset +
        "  " + dim + ts + reset
    elif .event == "iteration_end" then
      bold + magenta + "── iter \(.iteration) end" + reset +
      "  " + dim + "rc=\(.rc)  \(ts)" + reset + "\n"
    else empty end

  elif .type == "system" and .subtype == "init" then
    blue + "◇  session" + reset +
    "  model=" + bold + (.model // "?") + reset +
    "  id="    + dim  + ((.session_id // "?" | tostring)[0:8]) + reset

  elif .type == "assistant" then
    (.message.content // [])
    | map(
        if .type == "thinking" then
          dim + "🧠 " + (.thinking // "" | squish | trim(300)) + reset
        elif .type == "text" then
          cyan + "💬 " + reset + (.text // "" | squish | trim(300))
        elif .type == "tool_use" then
          yellow + "🔧 " + bold + (.name // "?") + reset +
          "  " + dim + tool_summary(.name // "?"; .input // {}) + reset
        else empty end
      )
    | .[]

  elif .type == "user" then
    (.message.content // [])
    | map(
        if .type == "tool_result" then
          (if .is_error then red + "✗  " else green + "✓  " end) + reset +
          (. | result_text |
            (if length == 0 then dim + "(no output)" + reset else . end))
        else empty end
      )
    | .[]

  elif .type == "result" then
    blue + "⏹  session end" + reset +
    "  " + dim +
      "subtype=" + (.subtype // "?" | tostring) +
      "  duration=" + (.duration_ms // "?" | tostring) + "ms" +
      "  cost=$" + (.total_cost_usd // .cost_usd // "?" | tostring) +
      reset + "\n"

  else empty end
' 2>/dev/null
