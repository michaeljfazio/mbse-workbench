#!/usr/bin/env bash
# run-agent.sh — Ralph loop runner for the MBSE Workbench demo.
#
# Drives Claude Code in headless mode (`claude -p`) in a loop until
# the agent's STATUS.md reports terminal status. The agent's behavior
# is governed by AGENT.md in the repo root.
#
# Halting signals checked between iterations:
#   - STATUS.md contains "COMPLETE"                  → success
#   - STATUS.md contains "MANUAL INTERVENTION REQUIRED" → soft failure
#   - STATUS.md contains "HALTED BY OPERATOR"        → operator halt
#   - STOP file exists in repo root                  → operator halt
#
# Logs every iteration's start/end to loop.log with ISO timestamps.

set -euo pipefail

WORK_DIR="${WORK_DIR:-$(pwd)}"
LOG_FILE="${WORK_DIR}/loop.log"
TRACE_FILE="${WORK_DIR}/agent-trace.jsonl"     # raw streaming agent events (JSONL)
ITERATION_TIMEOUT="${ITERATION_TIMEOUT:-3600}"  # per-iteration timeout (seconds)
SLEEP_BETWEEN="${SLEEP_BETWEEN:-5}"             # short pause between iterations

# The headless agent invocation. --dangerously-skip-permissions is required
# for fully autonomous operation: the agent creates a repo, opens PRs,
# tags releases, deploys to Pages, etc. Only use this with a PAT scoped
# to the demo repo, and watch the loop.log if you care about cost.
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_FLAGS="${CLAUDE_FLAGS:---dangerously-skip-permissions}"

# Main loop runs on the most capable model. The orchestrating agent makes
# high-stakes decisions (what to work on, how to decompose, when to escalate)
# and must delegate well — Opus is worth the cost here because it dispatches
# cheaper subagents for the bulk of the work. Override with CLAUDE_MODEL=...
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-opus-4-7}"

cd "$WORK_DIR"

# Keep the system awake for the entire duration of the loop (macOS).
# caffeinate -w <pid> exits automatically when the target PID exits.
# -d display, -i idle, -m disk, -s system, -u declare user activity.
if command -v caffeinate >/dev/null 2>&1 && [[ -z "${RUN_AGENT_CAFFEINATED:-}" ]]; then
  export RUN_AGENT_CAFFEINATED=1
  caffeinate -dimsu -w "$$" &
  disown
fi

if [[ ! -f "$WORK_DIR/AGENT.md" ]]; then
  echo "ERROR: AGENT.md not found in $WORK_DIR. Copy the one-shot prompt"
  echo "from docs/superpowers/specs/2026-05-11-mbse-demo-design.md into"
  echo "AGENT.md before running." >&2
  exit 1
fi

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "$LOG_FILE"
}

check_halt() {
  if [[ -f "$WORK_DIR/STOP" ]]; then
    log "STOP file detected at repo root. Halting."
    return 0
  fi
  if [[ -f "$WORK_DIR/STATUS.md" ]]; then
    if grep -qE '^COMPLETE$' "$WORK_DIR/STATUS.md" 2>/dev/null; then
      log "STATUS.md reports COMPLETE. Demo finished."
      return 0
    fi
    if grep -qE '^MANUAL INTERVENTION REQUIRED$' "$WORK_DIR/STATUS.md" 2>/dev/null; then
      log "STATUS.md reports MANUAL INTERVENTION REQUIRED. Exiting."
      return 0
    fi
    if grep -qE '^HALTED BY OPERATOR$' "$WORK_DIR/STATUS.md" 2>/dev/null; then
      log "STATUS.md reports HALTED BY OPERATOR. Exiting."
      return 0
    fi
  fi
  return 1
}

log "Runner starting. WORK_DIR=$WORK_DIR"
log "Per-iteration timeout: ${ITERATION_TIMEOUT}s"

iteration=0
while true; do
  iteration=$((iteration + 1))

  if check_halt; then
    log "Halt condition met before iteration ${iteration}. Final state recorded."
    exit 0
  fi

  log "=== Iteration ${iteration} START ==="

  # The per-iteration prompt is intentionally tiny — the agent reads
  # AGENT.md and STATUS.md to know what to do. We only nudge it.
  PROMPT="Continue the autonomous Ralph loop defined in AGENT.md. Read STATUS.md and proceed with exactly one iteration's worth of work, then stop."

  # Mark a session boundary in the trace so watch-agent.sh can frame iterations.
  printf '{"type":"runner","event":"iteration_start","iteration":%d,"timestamp":"%s"}\n' \
    "$iteration" "$(date -Iseconds)" >> "$TRACE_FILE"

  # Stream the agent's events (thinking, tool calls, results) as JSONL to
  # the trace file. Errors go to loop.log. Stdout is the JSON stream.
  set +e
  timeout "$ITERATION_TIMEOUT" "$CLAUDE_BIN" -p \
    $CLAUDE_FLAGS \
    --model "$CLAUDE_MODEL" \
    --output-format stream-json --verbose \
    --append-system-prompt "$(cat "$WORK_DIR/AGENT.md")" \
    "$PROMPT" \
    2>>"$LOG_FILE" \
    >>"$TRACE_FILE"
  rc=$?
  set -e

  printf '{"type":"runner","event":"iteration_end","iteration":%d,"rc":%d,"timestamp":"%s"}\n' \
    "$iteration" "$rc" "$(date -Iseconds)" >> "$TRACE_FILE"

  log "=== Iteration ${iteration} END (rc=${rc}) ==="

  if [[ "$rc" -eq 124 ]]; then
    log "WARNING: iteration timed out after ${ITERATION_TIMEOUT}s. Continuing."
  fi

  if check_halt; then
    log "Halt condition met after iteration ${iteration}. Exiting."
    exit 0
  fi

  sleep "$SLEEP_BETWEEN"
done
