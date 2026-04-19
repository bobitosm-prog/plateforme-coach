-- Allow coaches to read their clients' meal_plans
CREATE POLICY "meal_plans_coach_read" ON meal_plans
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = meal_plans.user_id
  )
);

-- Allow coaches to read their clients' meal_tracking
CREATE POLICY "meal_tracking_coach_read" ON meal_tracking
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = meal_tracking.user_id
  )
);
