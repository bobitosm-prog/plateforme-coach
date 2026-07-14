-- Security hotfix: payment writes are server-owned and coach reads require an active relation.
--
-- Deployment is additive and compatible with the current producers: platform checkout,
-- Stripe webhook and admin routes already use service_role; account deletion runs through
-- its existing privileged server RPC. Browser clients retain only the SELECT paths below.
--
-- Forward rollback: if a legitimate authenticated write is discovered, add a narrowly
-- scoped RPC/policy in a later migration after documenting its authority. Do not restore
-- the former payments_coach_all policy, which allowed arbitrary coach-owned mutations.

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_client_read ON public.payments;
DROP POLICY IF EXISTS payments_coach_all ON public.payments;
DROP POLICY IF EXISTS payments_client_select_own ON public.payments;
DROP POLICY IF EXISTS payments_coach_select_active_clients ON public.payments;

CREATE POLICY payments_client_select_own
ON public.payments
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY payments_coach_select_active_clients
ON public.payments
FOR SELECT
TO authenticated
USING (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = auth.uid()
      AND relation.coach_id = payments.coach_id
      AND relation.client_id = payments.client_id
      AND relation.status = 'active'
  )
);

REVOKE ALL ON TABLE public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.payments FROM authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

COMMENT ON TABLE public.payments IS
  'Server-owned Stripe payment ledger. Authenticated users have read-only access through owner/active-coach RLS policies; mutations require a privileged server context.';
