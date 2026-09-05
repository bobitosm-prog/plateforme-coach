-- Authenticated clients may only persist their own user messages.
-- Assistant messages are written by the trusted Athena server writer.

DROP POLICY IF EXISTS "users insert own chat ai messages" ON public.chat_ai_messages;

CREATE POLICY "users insert own chat ai messages"
ON public.chat_ai_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'user'
);
