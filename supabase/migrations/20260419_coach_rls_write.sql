-- Allow coaches to write client_programs for their clients
CREATE POLICY "client_programs_coach_write" ON client_programs
FOR ALL USING (auth.uid() = coach_id)
WITH CHECK (auth.uid() = coach_id);

-- Allow coaches to write custom_programs for their clients
CREATE POLICY "custom_programs_coach_insert" ON custom_programs
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT coach_id FROM coach_clients WHERE client_id = custom_programs.user_id)
);

CREATE POLICY "custom_programs_coach_update" ON custom_programs
FOR UPDATE USING (
  auth.uid() IN (SELECT coach_id FROM coach_clients WHERE client_id = custom_programs.user_id)
);

-- Allow coaches to write client_meal_plans for their clients
CREATE POLICY "client_meal_plans_coach_write" ON client_meal_plans
FOR ALL USING (auth.uid() = coach_id)
WITH CHECK (auth.uid() = coach_id);
