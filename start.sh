#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"; BACKEND_PORT="${BACKEND_PORT:-3001}"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"; CHILD_PIDS=()
require_file(){ [ -f "$1" ] || { echo "Missing required file: $1" >&2; exit 1; }; }
require_package(){ (cd "$1" && node -e "try { require.resolve('$2'); } catch { require.resolve('$2/package.json'); }") >/dev/null 2>&1 || { echo "Missing dependency package: $2 (run npm ci at the repository root)" >&2; exit 1; }; }
port_free(){ if command -v lsof >/dev/null 2>&1 && lsof -ti ":$1" >/dev/null 2>&1; then echo "Port $1 is already in use; refusing to terminate another process." >&2; exit 1; fi; }
cleanup(){ for pid in "${CHILD_PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done; }; trap cleanup INT TERM EXIT
require_file "$PROJECT_DIR/.env"; require_package "$PROJECT_DIR/backend" pg; require_package "$PROJECT_DIR/frontend" react-scripts; port_free "$BACKEND_PORT"; port_free "$FRONTEND_PORT"
(cd "$PROJECT_DIR/backend" && BACKEND_PORT="$BACKEND_PORT" npm start) & CHILD_PIDS+=("$!")
(cd "$PROJECT_DIR/frontend" && BROWSER=none PORT="$FRONTEND_PORT" npm start) & CHILD_PIDS+=("$!")
echo "Governed financial-report services started without installing, seeding, migrating, or reclaiming ports."; wait "${CHILD_PIDS[@]}"
