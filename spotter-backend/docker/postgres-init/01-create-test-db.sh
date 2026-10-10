#!/bin/sh
# Creates a separate database for tests (Django also creates test_<name>
# automatically; this one is for manual/integration use).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE ${POSTGRES_DB}_test;"
