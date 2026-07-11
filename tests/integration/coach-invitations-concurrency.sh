#!/usr/bin/env bash
set -euo pipefail

: "${MOOVX_TEST_DATABASE_URL:?MOOVX_TEST_DATABASE_URL is required}"

psql_cmd=(psql "$MOOVX_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq)
coach_id='10000000-0000-4000-8000-000000000001'
client_id='20000000-0000-4000-8000-000000000002'
invitation_id='30000000-0000-4000-8000-000000000020'
token_hex=$(printf '30%.0s' {1..32})

"${psql_cmd[@]}" <<SQL
DELETE FROM public.coach_clients WHERE coach_id = '$coach_id' AND client_id = '$client_id';
DELETE FROM public.coach_invitations WHERE id = '$invitation_id';
UPDATE public.profiles
SET subscription_type = NULL, subscription_status = NULL, trial_ends_at = NULL
WHERE id = '$client_id';
INSERT INTO public.coach_invitations (
  id, coach_id, recipient_email, token_hash, expires_at
) VALUES (
  '$invitation_id', '$coach_id', 'other@example.test', decode('$token_hex', 'hex'), now() + interval '7 days'
);
SQL

call_rpc() {
  "${psql_cmd[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$client_id', true);
SELECT public.consume_coach_invitation(decode('$token_hex', 'hex'))::text;
COMMIT;
SQL
}

tmp_a=$(mktemp)
tmp_b=$(mktemp)
trap 'rm -f "$tmp_a" "$tmp_b"' EXIT

call_rpc >"$tmp_a" &
pid_a=$!
call_rpc >"$tmp_b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"

combined=$(printf '%s\n%s\n' "$(cat "$tmp_a")" "$(cat "$tmp_b")")
success_count=$(printf '%s\n' "$combined" | grep -c '"success": true' || true)
used_count=$(printf '%s\n' "$combined" | grep -c 'INVITATION_ALREADY_USED' || true)

if [[ "$success_count" -ne 1 || "$used_count" -ne 1 ]]; then
  printf 'Unexpected concurrent results:\n%s\n' "$combined" >&2
  exit 1
fi

"${psql_cmd[@]}" <<SQL
SELECT test.assert(
  (SELECT count(*) = 1 FROM public.coach_clients WHERE coach_id = '$coach_id' AND client_id = '$client_id'),
  'concurrency created an invalid relation count'
);
SELECT test.assert(
  (SELECT status = 'consumed' AND consumed_by = '$client_id' AND consumed_at IS NOT NULL
   FROM public.coach_invitations WHERE id = '$invitation_id'),
  'concurrency did not produce one consumed invitation'
);
SQL

printf 'coach invitation concurrency test passed\n'
