#!/usr/bin/env bash
# RSYNC_RSH is set by CI to require a pinned SSH host key; tests use local paths.
set -euo pipefail
workspace="${1:?Pass source workspace}"
destination="${2:?Pass destination workspace}"
cd "$workspace"
rsync -az --delete \
  --include='.env.example' --include='.env.*.example' \
  --exclude='.env' --exclude='.env.*' --exclude='.git/' \
  --exclude='node_modules/' --exclude='.venv/' --exclude='__pycache__/' \
  --exclude='*.pyc' --exclude='db.sqlite3' --exclude='staticfiles/' \
  --exclude='.output/' --exclude='dist/' --exclude='coverage/' \
  --exclude='playwright-report/' --exclude='test-results/' \
  spotter-frontend spotter-backend spotter-infrastructure "$destination/"
