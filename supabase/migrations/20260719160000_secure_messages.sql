-- Secure coach/client messaging and align the canonical schema with runtime.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.messages.image_url IS
  'Nullable storage object path supplied by existing messaging clients; access inherits the message active-relation scope.';

DROP POLICY IF EXISTS "users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "users can send messages" ON public.messages;
DROP POLICY IF EXISTS "users can mark own messages read" ON public.messages;
DROP POLICY IF EXISTS "messages_read_own" ON public.messages;
DROP POLICY IF EXISTS "messages_send" ON public.messages;
DROP POLICY IF EXISTS "messages_mark_read" ON public.messages;
DROP POLICY IF EXISTS "messages_coach_rw" ON public.messages;

CREATE OR REPLACE FUNCTION public.is_active_messaging_pair(
  p_sender_id uuid,
  p_receiver_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    JOIN public.profiles AS coach ON coach.id = relation.coach_id
    JOIN public.profiles AS client ON client.id = relation.client_id
    WHERE relation.status = 'active'
      AND coach.role = 'coach'
      AND client.role = 'client'
      AND client.subscription_type IS DISTINCT FROM 'invited'
      AND (
        (relation.coach_id = p_sender_id AND relation.client_id = p_receiver_id)
        OR
        (relation.client_id = p_sender_id AND relation.coach_id = p_receiver_id)
      )
  );
$$;

ALTER FUNCTION public.is_active_messaging_pair(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_active_messaging_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_messaging_pair(uuid, uuid) TO authenticated, service_role;

CREATE POLICY messages_select_active_participants
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (sender_id, receiver_id)
  AND public.is_active_messaging_pair(sender_id, receiver_id)
);

CREATE POLICY messages_insert_active_participants
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_active_messaging_pair(sender_id, receiver_id)
);

CREATE POLICY messages_update_read_active_recipient
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = receiver_id
  AND public.is_active_messaging_pair(sender_id, receiver_id)
)
WITH CHECK (
  auth.uid() = receiver_id
  AND public.is_active_messaging_pair(sender_id, receiver_id)
);

CREATE OR REPLACE FUNCTION public.guard_message_read_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (NEW.read IS DISTINCT FROM true OR OLD.read IS TRUE) THEN
    RAISE EXCEPTION 'Message read state transition not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_read_update_guard ON public.messages;
CREATE TRIGGER messages_read_update_guard
BEFORE UPDATE OF read ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_read_update();

REVOKE ALL ON TABLE public.messages FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
GRANT UPDATE (read) ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages') <> 3 THEN
    RAISE EXCEPTION 'messages must expose exactly three policies';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND cmd = 'ALL') THEN
    RAISE EXCEPTION 'messages must not expose a FOR ALL policy';
  END IF;
END $$;
