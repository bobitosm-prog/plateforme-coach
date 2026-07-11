#!/usr/bin/env bash
set -euo pipefail

: "${MOOVX_TEST_DATABASE_URL:?MOOVX_TEST_DATABASE_URL must target an isolated local database}"

case "$MOOVX_TEST_DATABASE_URL" in
  *127.0.0.1*|*localhost*) ;;
  *)
    echo "Refusing to run migration reset against a non-local database" >&2
    exit 1
    ;;
esac

psql "$MOOVX_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f tests/integration/supabase-platform-bootstrap.sql

while IFS= read -r migration; do
  echo "applying $(basename "$migration")"
  psql "$MOOVX_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort)
