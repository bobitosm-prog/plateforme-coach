-- Messages table for coach ↔ client chat
CREATE TABLE IF NOT EXISTS messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx   ON messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_idx  ON messages (created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own messages"
ON messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "users can send messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "users can mark own messages read"
ON messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());
