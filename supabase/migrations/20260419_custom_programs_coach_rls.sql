-- Coach can delete custom_programs of their clients
CREATE POLICY "custom_programs_coach_delete" ON custom_programs
FOR DELETE USING (
  auth.uid() IN (SELECT coach_id FROM coach_clients WHERE client_id = custom_programs.user_id)
);
