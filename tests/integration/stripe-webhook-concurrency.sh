#!/usr/bin/env bash
set -euo pipefail

database_url="${MOOVX_TEST_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"
event_id="evt_concurrent_claim_test"
first="$(mktemp)"
second="$(mktemp)"

cleanup() {
  psql "$database_url" -X -v ON_ERROR_STOP=1 -qAtc "delete from public.stripe_webhook_events where event_id = '$event_id'" >/dev/null || true
  rm -f "$first" "$second"
}
trap cleanup EXIT

psql "$database_url" -X -v ON_ERROR_STOP=1 -qAtc "delete from public.stripe_webhook_events where event_id = '$event_id'"

psql "$database_url" -X -v ON_ERROR_STOP=1 -qAtc \
  "select public.claim_stripe_webhook_event('$event_id','checkout.session.completed','{\"id\":\"cs_concurrent\"}'::jsonb)" >"$first" &
pid_first=$!
psql "$database_url" -X -v ON_ERROR_STOP=1 -qAtc \
  "select public.claim_stripe_webhook_event('$event_id','checkout.session.completed','{\"id\":\"cs_concurrent\"}'::jsonb)" >"$second" &
pid_second=$!

wait "$pid_first"
wait "$pid_second"

results="$(sort "$first" "$second")"
expected=$'already_processing\nclaimed'
if [[ "$results" != "$expected" ]]; then
  echo "Unexpected concurrent webhook claims" >&2
  exit 1
fi

count="$(psql "$database_url" -X -v ON_ERROR_STOP=1 -qAtc "select count(*) from public.stripe_webhook_events where event_id = '$event_id'")"
if [[ "$count" != "1" ]]; then
  echo "Concurrent webhook claim created $count rows" >&2
  exit 1
fi

echo "stripe webhook concurrency test passed"
