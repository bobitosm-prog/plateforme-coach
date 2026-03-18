-- RLS policies for progress_photos
-- Clients can read and insert their own photos only

CREATE POLICY "clients can read own photos"
ON progress_photos FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "clients can insert own photos"
ON progress_photos FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
