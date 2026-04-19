-- Ensure coaches can read/write messages with their clients
-- Messages policy: coach can read messages where they are sender or receiver
CREATE POLICY "messages_coach_rw" ON messages
FOR ALL USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
) WITH CHECK (
  auth.uid() = sender_id
);
