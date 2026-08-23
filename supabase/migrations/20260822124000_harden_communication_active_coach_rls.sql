BEGIN;

DO $preflight$
DECLARE
  target_table text;
BEGIN
  IF to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'COMMUNICATION_RLS_REQUIRES_ACTIVE_RELATION_HELPER';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'messages',
    'coach_notes',
    'coach_appointments',
    'activity_feed'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'COMMUNICATION_RLS_REQUIRES_TABLE: %', target_table;
    END IF;
  END LOOP;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.is_active_messaging_pair(
  p_sender_id uuid,
  p_receiver_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    public.is_active_coach_client_relation(p_sender_id, p_receiver_id)
    OR public.is_active_coach_client_relation(p_receiver_id, p_sender_id);
$function$;

REVOKE ALL ON FUNCTION public.is_active_messaging_pair(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_messaging_pair(uuid, uuid)
  TO authenticated, service_role;

-- The runtime marks received messages as read. Restrict its UPDATE privilege to
-- that column so recipients cannot rewrite content or participant identities.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read) ON public.messages TO authenticated;

DROP POLICY IF EXISTS "can read own messages" ON public.messages;
DROP POLICY IF EXISTS "users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "users can send messages" ON public.messages;
DROP POLICY IF EXISTS "users can mark own messages read" ON public.messages;
DROP POLICY IF EXISTS "messages_read_own" ON public.messages;
DROP POLICY IF EXISTS "messages_send" ON public.messages;
DROP POLICY IF EXISTS "messages_mark_read" ON public.messages;
DROP POLICY IF EXISTS "messages_coach_rw" ON public.messages;

DROP POLICY IF EXISTS "messages_select_active_participants" ON public.messages;
CREATE POLICY "messages_select_active_participants"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (auth.uid() = messages.sender_id OR auth.uid() = messages.receiver_id)
  AND public.is_active_messaging_pair(messages.sender_id, messages.receiver_id)
);

DROP POLICY IF EXISTS "messages_insert_active_participants" ON public.messages;
CREATE POLICY "messages_insert_active_participants"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = messages.sender_id
  AND public.is_active_messaging_pair(messages.sender_id, messages.receiver_id)
);

DROP POLICY IF EXISTS "messages_update_read_active_recipient" ON public.messages;
CREATE POLICY "messages_update_read_active_recipient"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = messages.receiver_id
  AND public.is_active_messaging_pair(messages.sender_id, messages.receiver_id)
)
WITH CHECK (
  auth.uid() = messages.receiver_id
  AND public.is_active_messaging_pair(messages.sender_id, messages.receiver_id)
);

DROP POLICY IF EXISTS "coach_notes_coach_all" ON public.coach_notes;

DROP POLICY IF EXISTS "coach_notes_coach_select_active" ON public.coach_notes;
CREATE POLICY "coach_notes_coach_select_active"
ON public.coach_notes
FOR SELECT
TO authenticated
USING (
  auth.uid() = coach_notes.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_notes.client_id
  )
);

DROP POLICY IF EXISTS "coach_notes_coach_insert_active" ON public.coach_notes;
CREATE POLICY "coach_notes_coach_insert_active"
ON public.coach_notes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_notes.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_notes.client_id
  )
);

DROP POLICY IF EXISTS "coach_notes_coach_update_active" ON public.coach_notes;
CREATE POLICY "coach_notes_coach_update_active"
ON public.coach_notes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = coach_notes.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_notes.client_id
  )
)
WITH CHECK (
  auth.uid() = coach_notes.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_notes.client_id
  )
);

DROP POLICY IF EXISTS "Coach manages own appointments"
  ON public.coach_appointments;

DROP POLICY IF EXISTS "coach_appointments_coach_select_active"
  ON public.coach_appointments;
CREATE POLICY "coach_appointments_coach_select_active"
ON public.coach_appointments
FOR SELECT
TO authenticated
USING (
  auth.uid() = coach_appointments.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_appointments.client_id
  )
);

DROP POLICY IF EXISTS "coach_appointments_coach_insert_active"
  ON public.coach_appointments;
CREATE POLICY "coach_appointments_coach_insert_active"
ON public.coach_appointments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_appointments.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_appointments.client_id
  )
);

DROP POLICY IF EXISTS "coach_appointments_coach_update_active"
  ON public.coach_appointments;
CREATE POLICY "coach_appointments_coach_update_active"
ON public.coach_appointments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = coach_appointments.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_appointments.client_id
  )
)
WITH CHECK (
  auth.uid() = coach_appointments.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_appointments.client_id
  )
);

DROP POLICY IF EXISTS "coach_appointments_coach_delete_active"
  ON public.coach_appointments;
CREATE POLICY "coach_appointments_coach_delete_active"
ON public.coach_appointments
FOR DELETE
TO authenticated
USING (
  auth.uid() = coach_appointments.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    coach_appointments.client_id
  )
);

DROP POLICY IF EXISTS "activity_feed_own" ON public.activity_feed;
CREATE POLICY "activity_feed_own"
ON public.activity_feed
FOR SELECT
TO authenticated
USING (
  auth.uid() = activity_feed.user_id
  OR (
    auth.uid() = activity_feed.coach_id
    AND public.is_active_coach_client_relation(
      auth.uid(),
      activity_feed.user_id
    )
  )
);

DROP POLICY IF EXISTS "activity_feed_insert" ON public.activity_feed;
CREATE POLICY "activity_feed_insert"
ON public.activity_feed
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = activity_feed.user_id
  OR (
    auth.uid() = activity_feed.coach_id
    AND public.is_active_coach_client_relation(
      auth.uid(),
      activity_feed.user_id
    )
  )
);

DO $postflight$
DECLARE
  required_policy_count integer;
BEGIN
  SELECT count(*)
  INTO required_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname, cmd) IN (
      ('messages', 'messages_select_active_participants', 'SELECT'),
      ('messages', 'messages_insert_active_participants', 'INSERT'),
      ('messages', 'messages_update_read_active_recipient', 'UPDATE'),
      ('coach_notes', 'coach_notes_coach_select_active', 'SELECT'),
      ('coach_notes', 'coach_notes_coach_insert_active', 'INSERT'),
      ('coach_notes', 'coach_notes_coach_update_active', 'UPDATE'),
      ('coach_appointments', 'coach_appointments_coach_select_active', 'SELECT'),
      ('coach_appointments', 'coach_appointments_coach_insert_active', 'INSERT'),
      ('coach_appointments', 'coach_appointments_coach_update_active', 'UPDATE'),
      ('coach_appointments', 'coach_appointments_coach_delete_active', 'DELETE'),
      ('activity_feed', 'activity_feed_own', 'SELECT'),
      ('activity_feed', 'activity_feed_insert', 'INSERT')
    )
    AND roles = ARRAY['authenticated']::name[]
    AND (
      coalesce(qual, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(with_check, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(qual, '') LIKE '%is_active_messaging_pair%'
      OR coalesce(with_check, '') LIKE '%is_active_messaging_pair%'
    );

  IF required_policy_count <> 12 THEN
    RAISE EXCEPTION 'COMMUNICATION_ACTIVE_POLICIES_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname IN (
        'can read own messages',
        'users can read own messages',
        'users can send messages',
        'users can mark own messages read',
        'messages_read_own',
        'messages_send',
        'messages_mark_read',
        'messages_coach_rw'
      )
  ) THEN
    RAISE EXCEPTION 'COMMUNICATION_LEGACY_MESSAGE_POLICY_REMAINS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('coach_notes', 'coach_appointments', 'activity_feed')
      AND (
        coalesce(qual, '') LIKE '%coach_clients%'
        OR coalesce(with_check, '') LIKE '%coach_clients%'
        OR (
          (
            coalesce(qual, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?coach_id'
            OR coalesce(with_check, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?coach_id'
          )
          AND coalesce(qual, '') NOT LIKE '%is_active_coach_client_relation%'
          AND coalesce(with_check, '') NOT LIKE '%is_active_coach_client_relation%'
        )
      )
  ) THEN
    RAISE EXCEPTION 'COMMUNICATION_LEGACY_COACH_BYPASS_REMAINS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND (
        coalesce(qual, '') ~ '(sender_id|receiver_id)'
        OR coalesce(with_check, '') ~ '(sender_id|receiver_id)'
      )
      AND coalesce(qual, '') NOT LIKE '%is_active_messaging_pair%'
      AND coalesce(with_check, '') NOT LIKE '%is_active_messaging_pair%'
  ) THEN
    RAISE EXCEPTION 'COMMUNICATION_MESSAGE_PARTICIPANT_BYPASS_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
