#!/usr/bin/env bash
# dashb-dev.sh — tmux session launcher for DashBee development
#
# Usage:
#   ./dashb-dev.sh              # Create or attach to 'dashb' session
#   ./dashb-dev.sh kill         # Kill the session
#
# Layout (3 windows):
#   1: claude  — Primary Claude Code (single pane)
#   2: dev     — Next.js dev server (top) + Tests (bottom)  [horizontal split]
#   3: tools   — Shell (left) + Claude-2 (right)            [vertical split]

SESSION="dashb"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Cheat sheet displayed in every pane
CHEATSHEET='echo "
────────────────────────────────────────────────────────────────────────────
 tmux cheat sheet
  Panes:   Alt-Arrow (move)  |  Ctrl-a z (zoom)  |  Ctrl-a | (vsplit)  |  Ctrl-a - (hsplit)
  Windows: Shift-Left/Right  |  Ctrl-a 1/2/3 (jump by number)
  Other:   Ctrl-a [ (scroll/copy, q=exit)  |  Ctrl-a d (detach)  |  Ctrl-a r (reload config)
  Resize:  Ctrl-a Shift-Arrow  |  Mouse: click pane, scroll, drag borders
  Claude:  Ctrl-a y (popup)  |  Ctrl-a W (worktree agent)
────────────────────────────────────────────────────────────────────────────
"'

# Handle kill command
if [ "$1" = "kill" ]; then
    tmux kill-session -t "$SESSION" 2>/dev/null && echo "Session '$SESSION' killed" || echo "No session '$SESSION' found"
    exit 0
fi

# Attach if session already exists
if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Attaching to existing '$SESSION' session..."
    tmux attach -t "$SESSION"
    exit 0
fi

# ── Window 1: claude (single pane) ──────────────────────────────────────

tmux new-session -d -s "$SESSION" -n "claude" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:claude" "$CHEATSHEET" Enter
tmux send-keys -t "$SESSION:claude" "specstory run claude" Enter

# ── Window 2: dev (horizontal split — dev top, test bottom) ─────────────

tmux new-window -t "$SESSION" -n "dev" -c "$PROJECT_DIR"

# Top pane: Next.js dev server
tmux send-keys -t "$SESSION:dev" "$CHEATSHEET" Enter
tmux send-keys -t "$SESSION:dev" \
    'echo " Next.js Dev Server:
   pnpm dev                    # Turbopack dev server (port 3000)
   pnpm build                  # Production build
   pnpm lint                   # ESLint with --max-warnings 0
"' Enter

# Bottom pane: Test runners
tmux split-window -v -t "$SESSION:dev" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:dev.2" "$CHEATSHEET" Enter
tmux send-keys -t "$SESSION:dev.2" \
    'echo " Test Commands:
   pnpm test                   # Vitest unit tests (225+ tests)
   pnpm test:e2e               # Playwright e2e tests
   pnpm test:e2e:sqlite        # E2E with SQLite
   pnpm test:e2e:postgres      # E2E with PostgreSQL
   pnpm test:e2e:mysql         # E2E with MySQL
   pnpm test:llm               # LLM integration tests
   pnpm test:all               # Run all tests

 Database:
   pnpm docker:up              # Start sample DB containers
   pnpm docker:down            # Stop containers
   pnpm db:seed-sqlite         # Seed SQLite demo DB
"' Enter

# Select top pane (dev server)
tmux select-pane -t "$SESSION:dev.1"

# ── Window 3: tools (vertical split — shell left, claude-2 right) ───────

tmux new-window -t "$SESSION" -n "tools" -c "$PROJECT_DIR"

# Left pane: Shell
tmux send-keys -t "$SESSION:tools" "$CHEATSHEET" Enter
tmux send-keys -t "$SESSION:tools" \
    'echo " Shell — git, pnpm, docker, general commands
"' Enter

# Right pane: Secondary Claude Code
tmux split-window -h -t "$SESSION:tools" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:tools.2" "$CHEATSHEET" Enter
tmux send-keys -t "$SESSION:tools.2" \
    'echo " Claude Code (secondary) — parallel research / tasks
"' Enter
tmux send-keys -t "$SESSION:tools.2" "specstory run claude" Enter

# Select left pane (shell)
tmux select-pane -t "$SESSION:tools.1"

# ── Attach to session, starting at window 1 (claude) ────────────────────

tmux select-window -t "$SESSION:claude"
tmux attach -t "$SESSION"
