-- Migration : activer RLS sur commissions (trou sécurité P0).
-- Table sans aucune policy → tout user authentifié pouvait lire/modifier
-- les données financières de tous les coachs.
-- Seuls writers légitimes = webhook Stripe (service_role) + delete_user_account
-- (SECURITY DEFINER) → les deux bypassent RLS. Le coach ne fait que LIRE.
-- Idempotent : DROP IF EXISTS + guard ENABLE.

-- 1. Activer RLS (idempotent — ENABLE sur table déjà activée = no-op)
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT : le coach lit ses propres commissions
DROP POLICY IF EXISTS "commissions_coach_read" ON commissions;
CREATE POLICY "commissions_coach_read" ON commissions
  FOR SELECT
  USING (coach_id = auth.uid());

-- Pas de policy INSERT/UPDATE/DELETE côté client :
-- les writes passent par service_role (webhook Stripe) ou
-- SECURITY DEFINER (delete_user_account). Les deux bypassent RLS.
