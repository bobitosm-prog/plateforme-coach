-- Keep trigger bodies, owners, ACLs and invoker semantics unchanged.
-- Both functions were inspected in staging and production before this change.
BEGIN;
ALTER FUNCTION public.guard_profile_sensitive_columns() SET search_path = '';
ALTER FUNCTION public.update_profiles_updated_at() SET search_path = '';
COMMIT;
