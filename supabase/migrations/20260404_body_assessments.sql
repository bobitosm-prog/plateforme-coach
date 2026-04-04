ALTER TABLE progress_photos
ADD COLUMN IF NOT EXISTS view_type text DEFAULT 'front';

CREATE TABLE IF NOT EXISTS body_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  photo_front_url text,
  photo_back_url text,
  photo_side_url text,
  ai_assessment text,
  muscle_balance jsonb,
  weak_zones text[],
  strong_zones text[],
  recommendations text[]
);
