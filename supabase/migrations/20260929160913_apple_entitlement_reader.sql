BEGIN;
-- Hard-coded Production: a browser, header or native test flag cannot select Sandbox.
CREATE OR REPLACE FUNCTION public.read_apple_entitlement_states(p_user_id uuid)
RETURNS TABLE(state text, access_until_ms bigint, checked_ms bigint, product_id text,
  revoked_ms bigint, is_upgraded boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT s.state,s.access_until_ms,s.checked_ms,e.product_id,e.revoked_ms,e.is_upgraded
  FROM public.apple_account_bindings b
  JOIN public.apple_purchase_owners o ON o.environment=b.environment AND o.app_account_token=b.app_account_token
  JOIN public.apple_purchase_state s ON s.environment=o.environment AND s.original_transaction_id=o.original_transaction_id
  JOIN public.apple_transaction_evidence e ON e.environment=s.environment AND e.transaction_id=s.transaction_id
    AND e.signed_ms=s.signed_ms AND e.original_transaction_id=s.original_transaction_id
  WHERE b.user_id=p_user_id AND b.environment='Production';
$$;
REVOKE ALL ON FUNCTION public.read_apple_entitlement_states(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_apple_entitlement_states(uuid) TO service_role;
COMMIT;
