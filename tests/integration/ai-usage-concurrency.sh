#!/usr/bin/env bash
set -euo pipefail

: "${MOOVX_TEST_DATABASE_URL:?MOOVX_TEST_DATABASE_URL is required}"
psql_cmd=(psql "$MOOVX_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq)
user_id='71000000-0000-4000-8000-000000000001'

"${psql_cmd[@]}" <<SQL
SELECT test.seed_personas();
DELETE FROM public.ai_usage_logs WHERE user_id='$user_id' AND feature='chat-ai';
DO \$\$
BEGIN
  FOR i IN 1..19 LOOP
    PERFORM public.reserve_ai_usage_internal('$user_id','user','$user_id','chat-ai','concurrency-seed-'||i,'anthropic-sonnet-4.6');
  END LOOP;
END \$\$;
SQL

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
trap 'rm -f "$tmp_a" "$tmp_b"; "${psql_cmd[@]}" -c "DELETE FROM public.ai_usage_logs WHERE user_id='"'"'$user_id'"'"' AND correlation_id LIKE '"'"'concurrency-%'"'"'" >/dev/null' EXIT
reserve concurrency-a >"$tmp_a" & pid_a=$!
reserve concurrency-b >"$tmp_b" & pid_b=$!
wait "$pid_a"
wait "$pid_b"

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
