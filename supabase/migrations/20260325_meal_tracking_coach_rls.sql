-- Allow coaches to view meal tracking data for their clients
-- Required for the weekly tracking grid in app/client/[id]/page.tsx

DROP POLICY IF EXISTS "users manage own tracking" ON meal_tracking;
DROP POLICY IF EXISTS "Coaches can view client meal tracking" ON meal_tracking;

-- Users can manage their own tracking
CREATE POLICY "users manage own tracking" ON meal_tracking
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Coaches can SELECT their clients' tracking data
CREATE POLICY "Coaches can view client meal tracking" ON meal_tracking
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = meal_tracking.user_id
    )
  );

NOTIFY pgrst, 'reload schema';
