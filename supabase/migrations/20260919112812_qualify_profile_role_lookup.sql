BEGIN;
-- Preserve the existing owner, ACL and definer semantics used by profile RLS.
-- Only qualify the relation and pin resolution: caller search_path must not
-- determine which profiles table is consulted by this privileged lookup.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;
COMMIT;
