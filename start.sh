#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"; set -a; source "$PROJECT_DIR/.env"; set +a; BACKEND_PORT="${BACKEND_PORT:-3001}"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"; CHILD_PIDS=()
require_file(){ [ -f "$1" ] || { echo "Missing required file: $1" >&2; exit 1; }; }
require_package(){ (cd "$1" && node -e "try { require.resolve('$2'); } catch { require.resolve('$2/package.json'); }") >/dev/null 2>&1 || { echo "Missing dependency package: $2 (run npm ci at the repository root)" >&2; exit 1; }; }
port_free(){ if command -v lsof >/dev/null 2>&1 && lsof -ti ":$1" >/dev/null 2>&1; then echo "Port $1 is already in use; refusing to terminate another process." >&2; exit 1; fi; }
cleanup(){ for pid in "${CHILD_PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done; }; trap cleanup INT TERM EXIT
require_file "$PROJECT_DIR/.env"; require_package "$PROJECT_DIR/backend" pg; require_package "$PROJECT_DIR/frontend" react-scripts; port_free "$BACKEND_PORT"; port_free "$FRONTEND_PORT"
(cd "$PROJECT_DIR/backend" && exec env BACKEND_PORT="$BACKEND_PORT" npm start) & CHILD_PIDS+=("$!")
for attempt in {1..120}; do curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1 && break; kill -0 "${CHILD_PIDS[0]}" 2>/dev/null || { echo "Backend exited before becoming ready" >&2; exit 1; }; sleep 0.25; done
curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1 || { echo "Backend did not become ready" >&2; exit 1; }
(cd "$PROJECT_DIR/frontend" && exec env BROWSER=none PORT="$FRONTEND_PORT" REACT_APP_API_URL="http://127.0.0.1:$BACKEND_PORT/api" BACKEND_PORT="$BACKEND_PORT" npm start) & CHILD_PIDS+=("$!")
echo "Governed financial-report services started without installing, seeding, migrating, or reclaiming ports."; wait "${CHILD_PIDS[@]}"
