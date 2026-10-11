#!/usr/bin/env bash
# Run on the development server after the three service directories are synced.
set -euo pipefail

workspace="${1:?Pass the absolute Spotter workspace directory}"
[[ "$workspace" == /* && "$workspace" != / ]] || { echo "Invalid workspace" >&2; exit 1; }
cd "$workspace/spotter-infrastructure"
[[ -f .env.development ]] || { echo "Server .env.development is required" >&2; exit 1; }
cp workspace.dockerignore ../.dockerignore
compose=(docker compose --env-file .env.development -f docker-compose.development.yml)

"${compose[@]}" config --quiet
# Build before changing running services: failed builds leave them running.
"${compose[@]}" build spotter-backend spotter-frontend webserver

if [[ -n "$("${compose[@]}" ps --status running -q postgres)" ]]; then
  umask 077
  mkdir -p "$workspace/backups"
  backup="$workspace/backups/development-$(date -u +%Y%m%dT%H%M%SZ).sql"
  if ! "${compose[@]}" exec -T postgres sh -c 'pg_dump --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$backup"; then
    rm -f "$backup"
    echo "Database backup failed; services were not restarted" >&2
    exit 1
  fi
  [[ -s "$backup" ]] || { echo "Database backup is empty; stopping" >&2; exit 1; }
  echo "Pre-migration backup saved on the server"
fi

# Keep the existing Compose project and volumes. Never down or prune here.
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" exec -T spotter-backend python manage.py check
"${compose[@]}" exec -T webserver sh -ec '
  wget -q -O /dev/null --header "Host: $PUBLIC_HOST" http://127.0.0.1/api/ready
  wget -q -O /dev/null --header "Host: $PUBLIC_HOST" http://127.0.0.1/
'
echo "Development frontend, backend, database and cache are ready"
