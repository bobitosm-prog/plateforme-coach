#!/usr/bin/env bash
set -euo pipefail

: "${MOOVX_TEST_DATABASE_URL:?MOOVX_TEST_DATABASE_URL is required}"
psql_cmd=(psql "$MOOVX_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq)
user_id='71000000-0000-4000-8000-000000000001'
tmp_a=''
tmp_b=''
pid_a=''
pid_b=''
fixtures_seeded=0

cleanup() {
  local exit_code=$?
  local cleanup_status=0
  trap - EXIT INT TERM
  set +e

  for child_pid in "$pid_a" "$pid_b"; do
    if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
      kill "$child_pid" 2>/dev/null
      wait "$child_pid" 2>/dev/null
    fi
  done
  [[ -z "$tmp_a" ]] || rm -f "$tmp_a"
  [[ -z "$tmp_b" ]] || rm -f "$tmp_b"

  if [[ "$fixtures_seeded" = '1' ]]; then
    "${psql_cmd[@]}" >/dev/null <<SQL
BEGIN;
DELETE FROM public.ai_usage_logs
WHERE user_id = '$user_id'
  AND correlation_id LIKE 'concurrency-%';
SELECT test.cleanup_personas();
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id IN (SELECT id FROM test.personas)
  ) THEN
    RAISE EXCEPTION 'AI_USAGE_CONCURRENCY_CLEANUP_FAILED [auth.users]';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id IN (SELECT id FROM test.personas)
  ) THEN
    RAISE EXCEPTION 'AI_USAGE_CONCURRENCY_CLEANUP_FAILED [profiles]';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE coach_id IN (SELECT id FROM test.personas)
       OR client_id IN (SELECT id FROM test.personas)
  ) THEN
    RAISE EXCEPTION 'AI_USAGE_CONCURRENCY_CLEANUP_FAILED [coach_clients]';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ai_usage_logs
    WHERE user_id = '$user_id'
      AND correlation_id LIKE 'concurrency-%'
  ) THEN
    RAISE EXCEPTION 'AI_USAGE_CONCURRENCY_CLEANUP_FAILED [ai_usage_logs]';
  END IF;
END
\$\$;
COMMIT;
SQL
    cleanup_status=$?
  fi

  if [[ "$cleanup_status" -ne 0 ]]; then
    printf 'AI usage concurrency cleanup failed\n' >&2
    exit "$cleanup_status"
  fi
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${psql_cmd[@]}" <<SQL
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id IN (SELECT id FROM test.personas)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id IN (SELECT id FROM test.personas)
  ) OR EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE coach_id IN (SELECT id FROM test.personas)
       OR client_id IN (SELECT id FROM test.personas)
  ) OR EXISTS (
    SELECT 1 FROM public.ai_usage_logs
    WHERE user_id = '$user_id'
      AND correlation_id LIKE 'concurrency-%'
  ) THEN
    RAISE EXCEPTION 'AI_USAGE_CONCURRENCY_PRECONDITION_FAILED [synthetic scope is not empty]';
  END IF;
END
\$\$;
SQL
fixtures_seeded=1

"${psql_cmd[@]}" <<SQL
BEGIN;
SELECT test.seed_personas();
DO \$\$
BEGIN
  FOR i IN 1..19 LOOP
    PERFORM public.reserve_ai_usage_internal('$user_id','user','$user_id','chat-ai','concurrency-seed-'||i,'anthropic-sonnet-4.6');
  END LOOP;
END \$\$;
COMMIT;
SQL

case "${MOOVX_AI_USAGE_CONCURRENCY_TEST_MODE:-}" in
  '') ;;
  fail-after-seed) exit 86 ;;
  term-after-seed) kill -TERM "$$" ;;
  *) printf 'Unknown AI usage concurrency test mode\n' >&2; exit 87 ;;
esac

reserve() {
  local correlation_id="$1"
  "${psql_cmd[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$user_id',true);
SELECT public.reserve_ai_usage('chat-ai','$correlation_id','anthropic-sonnet-4.6')::text;
COMMIT;
SQL
}

tmp_a=$(mktemp)
tmp_b=$(mktemp)
reserve concurrency-a >"$tmp_a" & pid_a=$!
reserve concurrency-b >"$tmp_b" & pid_b=$!
wait "$pid_a"
pid_a=''
wait "$pid_b"
pid_b=''

combined=$(printf '%s\n%s\n' "$(cat "$tmp_a")" "$(cat "$tmp_b")")
allowed=$(printf '%s\n' "$combined" | grep -c '"status": "allowed"' || true)
denied=$(printf '%s\n' "$combined" | grep -c '"status": "denied"' || true)
if [[ "$allowed" -ne 1 || "$denied" -ne 1 ]]; then
  printf 'AI usage concurrency failed:\n%s\n' "$combined" >&2
  exit 1
fi

count=$("${psql_cmd[@]}" -c "SELECT count(*) FROM public.ai_usage_logs WHERE user_id='$user_id' AND feature='chat-ai' AND usage_status='reserved' AND expires_at>now()")
[[ "$count" = "20" ]] || { printf 'Expected 20 active reservations, got %s\n' "$count" >&2; exit 1; }
printf 'AI usage concurrency test passed\n'
