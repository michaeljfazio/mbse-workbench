# Manage the autonomous MBSE Workbench Ralph loop.
#
# The agent's behaviour is governed by AGENT.md; this file only manages the
# runner process (start / stop / observe). See run-agent.sh for the actual
# headless `claude -p` invocation.

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

pid_file := "loop.pid"
stop_file := "STOP"
log_file := "loop.log"
trace_file := "agent-trace.jsonl"

# Show available recipes.
default:
    @just --list --unsorted

# Kick off the loop in the background. Writes the runner PID to {{pid_file}}.
start:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -f "{{pid_file}}" ]] && kill -0 "$(cat "{{pid_file}}")" 2>/dev/null; then
        echo "Loop already running (PID $(cat "{{pid_file}}"))." >&2
        echo "Use 'just status' to inspect, 'just stop' to halt." >&2
        exit 1
    fi
    if [[ -f "{{stop_file}}" ]]; then
        echo "STOP file present at repo root — remove it before starting:" >&2
        echo "    rm {{stop_file}}" >&2
        exit 1
    fi
    if ! command -v claude >/dev/null 2>&1; then
        echo "'claude' CLI not found in PATH. Install Claude Code first." >&2
        exit 1
    fi
    nohup bash ./run-agent.sh </dev/null >/dev/null 2>&1 &
    echo $! >"{{pid_file}}"
    sleep 1
    if kill -0 "$(cat "{{pid_file}}")" 2>/dev/null; then
        printf '\033[32m✓\033[0m Loop started (PID %s)\n' "$(cat "{{pid_file}}")"
        echo "  Status: just status"
        echo "  Watch:  just watch"
        echo "  Logs:   just tail"
        echo "  Stop:   just stop"
    else
        echo "Loop failed to start. Inspect {{log_file}} for details." >&2
        rm -f "{{pid_file}}"
        exit 1
    fi

# Graceful stop — drops a STOP file; the current iteration finishes, then the runner exits cleanly.
stop:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -f "{{stop_file}}" ]]; then
        echo "STOP file already present. Loop will halt at the next iteration boundary."
        exit 0
    fi
    if [[ ! -f "{{pid_file}}" ]] || ! kill -0 "$(cat "{{pid_file}}" 2>/dev/null)" 2>/dev/null; then
        echo "No running loop detected. (Check 'just status'.)" >&2
        exit 1
    fi
    touch "{{stop_file}}"
    printf '\033[33m⏸\033[0m STOP file created — loop will exit after the current iteration.\n'
    echo "  Run 'just status' to watch for halt."
    echo "  To resume: rm {{stop_file}} && just start"

# Force kill — SIGTERM the runner immediately, killing any in-flight claude. Use only if 'just stop' hangs.
kill:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ ! -f "{{pid_file}}" ]]; then
        echo "No PID file — nothing to kill." >&2
        exit 1
    fi
    pid="$(cat "{{pid_file}}")"
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "Process $pid is not running. Cleaning up PID file."
        rm -f "{{pid_file}}"
        exit 0
    fi
    printf '\033[31m✗\033[0m Killing loop (PID %s) and any descendants...\n' "$pid"
    # Kill the child claude process first so the parent doesn't immediately
    # start another iteration.
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "{{pid_file}}"
    echo "Loop killed."

# Show whether the loop is running, current iteration, and a tail of the runner log.
status:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -f "{{stop_file}}" ]]; then
        printf '\033[33m⏸  STOP file present\033[0m — loop will halt at next iteration boundary.\n\n'
    fi
    if [[ ! -f "{{pid_file}}" ]]; then
        printf '\033[2mLoop:\033[0m \033[31mnot running\033[0m (no PID file).\n'
        echo "Start with: just start"
        exit 0
    fi
    pid="$(cat "{{pid_file}}")"
    if kill -0 "$pid" 2>/dev/null; then
        elapsed="$(ps -p "$pid" -o etime= | tr -d ' ')"
        iter_start="$(grep -c 'Iteration .* START' "{{log_file}}" 2>/dev/null || echo 0)"
        iter_end="$(grep -c 'Iteration .* END'   "{{log_file}}" 2>/dev/null || echo 0)"
        in_flight=$((iter_start - iter_end))
        printf '\033[32m●\033[0m Loop \033[1mRUNNING\033[0m\n'
        printf '  PID:        %s\n' "$pid"
        printf '  Elapsed:    %s\n' "$elapsed"
        printf '  Iterations: %s completed, %s in flight\n' "$iter_end" "$in_flight"
        echo
        echo "Recent log:"
        tail -n 5 "{{log_file}}" 2>/dev/null | sed 's/^/  /' || true
    else
        printf '\033[2mLoop:\033[0m \033[31mnot running\033[0m (PID %s is dead). Cleaning up.\n' "$pid"
        rm -f "{{pid_file}}"
    fi

# Pretty-printed live feed of the agent's thinking, tool calls, and results.
watch:
    @bash ./watch-agent.sh "{{trace_file}}"

# Tail the runner log (iteration start/end timestamps, halt detection).
tail:
    @tail -f "{{log_file}}"

# Show the last n entries from the runner log (default 50).
logs n="50":
    @tail -n "{{n}}" "{{log_file}}"

# Truncate the trace file (it grows unboundedly across a long session). Loop must be stopped.
clear-trace:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -f "{{pid_file}}" ]] && kill -0 "$(cat "{{pid_file}}")" 2>/dev/null; then
        echo "Loop is running — stop it first ('just stop') before clearing the trace." >&2
        exit 1
    fi
    : >"{{trace_file}}"
    echo "Cleared {{trace_file}}."
