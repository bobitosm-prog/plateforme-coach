-- Allow coaches to read their clients' data via coach_clients relationship
-- This fixes the "empty history" bug in the client detail page

-- Workout sessions
CREATE POLICY "workout_sessions_coach_read" ON workout_sessions
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = workout_sessions.user_id
  )
);

-- Workout sets
CREATE POLICY "workout_sets_coach_read" ON workout_sets
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = workout_sets.user_id
  )
);

-- Daily food logs
CREATE POLICY "daily_food_logs_coach_read" ON daily_food_logs
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = daily_food_logs.user_id
  )
);

-- Weight logs
CREATE POLICY "weight_logs_coach_read" ON weight_logs
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = weight_logs.user_id
  )
);

-- Progress photos
CREATE POLICY "progress_photos_coach_read" ON progress_photos
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = progress_photos.user_id
  )
);

-- Daily checkins
CREATE POLICY "daily_checkins_coach_read" ON daily_checkins
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = daily_checkins.user_id
  )
);

-- Body measurements
CREATE POLICY "body_measurements_coach_read" ON body_measurements
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = body_measurements.user_id
  )
);

-- Custom programs
CREATE POLICY "custom_programs_coach_read" ON custom_programs
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = custom_programs.user_id
  )
);

-- Personal records
CREATE POLICY "personal_records_coach_read" ON personal_records
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT coach_id FROM coach_clients WHERE client_id = personal_records.user_id
  )
);
