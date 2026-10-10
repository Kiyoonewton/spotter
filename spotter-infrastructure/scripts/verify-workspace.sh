#!/usr/bin/env bash
#
# One-shot local verification for the Spotter workspace. Runs against
# the Local stack (docker-compose.local.yml) and validates Development
# and Production Compose syntax without starting them. This is the local
# equivalent of what CI runs automatically — it is not a replacement for
# per-repository CI workflows, which still belong to each repo
# (frontend/backend) and to the infra CI workflows.
#
# Requirements:
#   - Python 3.12+ with the backend dev requirements, and Node.js 22+ and Yarn 1.x
#     (frontend `yarn quality`, Playwright tests) on the host
#   - Docker Desktop running
#
# Usage:
#   ./scripts/verify-workspace.sh --domain <your-local-domain>
#
# Safety:
#   - Never runs `docker compose down -v` — existing volumes are preserved.
#   - Never hardcodes a personal local domain; --domain is required.
#   - Stops on the first failure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$INFRA_DIR/../spotter-frontend"
BACKEND_DIR="$INFRA_DIR/../spotter-backend"

DOMAIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 --domain <your-local-domain>" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "Error: --domain is required, e.g. --domain your-app.test" >&2
  echo "This must resolve to 127.0.0.1 and match the server_name in webserver/conf.d/dev/spotter.conf." >&2
  exit 1
fi

COMPOSE_LOCAL=(docker compose -f docker-compose.local.yml)

step() {
  echo ""
  echo "==> $1"
}

fail() {
  echo "" >&2
  echo "FAILED: $1" >&2
  exit 1
}

step "Checking required sibling directories"
[[ -d "$FRONTEND_DIR" ]] || fail "Missing sibling directory: $FRONTEND_DIR"
[[ -d "$BACKEND_DIR" ]] || fail "Missing sibling directory: $BACKEND_DIR"
echo "Found $FRONTEND_DIR"
echo "Found $BACKEND_DIR"

step "Backend: make quality"
(cd "$BACKEND_DIR" && make quality) || fail "Backend make quality failed"

step "Frontend: yarn quality"
(cd "$FRONTEND_DIR/apps/web" && yarn quality) || fail "Frontend yarn quality failed"

step "Validating Local Compose syntax"
(cd "$INFRA_DIR" && "${COMPOSE_LOCAL[@]}" config --quiet) || fail "docker compose -f docker-compose.local.yml config failed"

step "Validating Development Compose syntax"
(cd "$INFRA_DIR" && docker compose -f docker-compose.development.yml config --quiet) || fail "docker compose -f docker-compose.development.yml config failed"

step "Validating Production Compose syntax"
(cd "$INFRA_DIR" && docker compose -f docker-compose.prod.yml config --quiet) || fail "docker compose -f docker-compose.prod.yml config failed"

step "Ensuring the Local stack is running"
cd "$INFRA_DIR"
if [[ "$("${COMPOSE_LOCAL[@]}" ps --status running --services | sort)" != "$("${COMPOSE_LOCAL[@]}" config --services | sort)" ]]; then
  echo "Stack is not fully up — starting it (docker compose -f docker-compose.local.yml up -d --build)"
  "${COMPOSE_LOCAL[@]}" up -d --build || fail "docker compose -f docker-compose.local.yml up -d --build failed"
else
  echo "Stack is already running"
fi

step "Waiting for Postgres and Redis to report healthy"
for service in postgres redis; do
  for _ in $(seq 1 30); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "spotter-$service" 2>/dev/null || echo "unknown")"
    [[ "$status" == "healthy" ]] && break
    sleep 2
  done
  [[ "$status" == "healthy" ]] || fail "$service did not become healthy in time"
  echo "$service is healthy"
done

step "Backend: tests against Postgres (inside the backend container)"
"${COMPOSE_LOCAL[@]}" exec -T spotter-backend python manage.py test || fail "Backend tests failed"

step "Infrastructure: Playwright smoke tests through Nginx (domain: $DOMAIN)"
(cd "$INFRA_DIR" && E2E_BASE_URL="http://$DOMAIN" yarn test:e2e) || fail "Infrastructure smoke tests failed"

echo ""
echo "All checks passed."
