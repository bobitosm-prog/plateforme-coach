\set ON_ERROR_STOP on

DO $preflight$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_PG17_REQUIRED';
  END IF;
END
$preflight$;

BEGIN;

CREATE TEMP TABLE global_maintain_non_maintain_acl_before
ON COMMIT PRESERVE ROWS
AS
SELECT
  namespace.nspname AS schema_name,
  relation.relname AS relation_name,
  coalesce(grantee.rolname, 'PUBLIC') AS grantee_name,
  grantor.rolname AS grantor_name,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = relation.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
) AS privilege
LEFT JOIN pg_catalog.pg_roles AS grantee
  ON grantee.oid = privilege.grantee
JOIN pg_catalog.pg_roles AS grantor
  ON grantor.oid = privilege.grantor
WHERE namespace.nspname = 'public'
  AND relation.relkind IN ('r', 'p')
  AND privilege.privilege_type IN (
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
  );

CREATE TEMP TABLE global_maintain_supabase_admin_default_acl_before
ON COMMIT PRESERVE ROWS
AS
SELECT
  defaults.defaclobjtype,
  defaults.defaclacl::text AS acl
FROM pg_catalog.pg_default_acl AS defaults
JOIN pg_catalog.pg_roles AS owner
  ON owner.oid = defaults.defaclrole
LEFT JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = defaults.defaclnamespace
WHERE owner.rolname = 'supabase_admin'
  AND namespace.nspname = 'public';

CREATE TEMP TABLE global_maintain_postgres_non_maintain_default_acl_before
ON COMMIT PRESERVE ROWS
AS
SELECT
  coalesce(grantee.rolname, 'PUBLIC') AS grantee_name,
  grantor.rolname AS grantor_name,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_catalog.pg_default_acl AS defaults
JOIN pg_catalog.pg_roles AS owner
  ON owner.oid = defaults.defaclrole
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = defaults.defaclnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) AS privilege
LEFT JOIN pg_catalog.pg_roles AS grantee
  ON grantee.oid = privilege.grantee
JOIN pg_catalog.pg_roles AS grantor
  ON grantor.oid = privilege.grantor
WHERE owner.rolname = 'postgres'
  AND namespace.nspname = 'public'
  AND defaults.defaclobjtype = 'r'
  AND privilege.privilege_type <> 'MAINTAIN';

DO $fixture$
BEGIN
  EXECUTE
    'GRANT MAINTAIN ON ALL TABLES IN SCHEMA public
     TO anon, authenticated, service_role';
  EXECUTE
    'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
     GRANT MAINTAIN ON TABLES TO anon, authenticated, service_role';
END
$fixture$;

DO $assertion$
DECLARE
  target_role text;
  maintain_count integer;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    SELECT count(*)
    INTO maintain_count
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(relation.relacl) AS privilege
    JOIN pg_catalog.pg_roles AS grantee
      ON grantee.oid = privilege.grantee
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND grantee.rolname = target_role
      AND privilege.privilege_type = 'MAINTAIN';

    IF maintain_count = 0 THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_PATTERN_NOT_REPRODUCED: %', target_role;
    END IF;
  END LOOP;
END
$assertion$;

COMMIT;

\ir ../../supabase/migrations/20260823140000_revoke_global_public_maintain_privileges.sql

BEGIN;

DO $assertion$
DECLARE
  remaining_count integer;
  acl_delta_count integer;
BEGIN
  SELECT count(*)
  INTO remaining_count
  FROM pg_catalog.pg_class AS relation
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
  ) AS privilege
  JOIN pg_catalog.pg_roles AS grantee
    ON grantee.oid = privilege.grantee
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND grantee.rolname IN ('anon', 'authenticated', 'service_role')
    AND privilege.privilege_type = 'MAINTAIN';

  IF remaining_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_EXISTING_GRANT_REMAINS: %', remaining_count;
  END IF;

  SELECT count(*)
  INTO remaining_count
  FROM pg_catalog.pg_default_acl AS defaults
  JOIN pg_catalog.pg_roles AS owner
    ON owner.oid = defaults.defaclrole
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = defaults.defaclnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) AS privilege
  JOIN pg_catalog.pg_roles AS grantee
    ON grantee.oid = privilege.grantee
  WHERE owner.rolname = 'postgres'
    AND namespace.nspname = 'public'
    AND defaults.defaclobjtype = 'r'
    AND grantee.rolname IN ('anon', 'authenticated', 'service_role')
    AND privilege.privilege_type = 'MAINTAIN';

  IF remaining_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_POSTGRES_DEFAULT_REMAINS: %', remaining_count;
  END IF;

  WITH acl_after AS (
    SELECT
      namespace.nspname AS schema_name,
      relation.relname AS relation_name,
      coalesce(grantee.rolname, 'PUBLIC') AS grantee_name,
      grantor.rolname AS grantor_name,
      privilege.privilege_type,
      privilege.is_grantable
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
    ) AS privilege
    LEFT JOIN pg_catalog.pg_roles AS grantee
      ON grantee.oid = privilege.grantee
    JOIN pg_catalog.pg_roles AS grantor
      ON grantor.oid = privilege.grantor
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND privilege.privilege_type IN (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
      )
  ), delta AS (
    (SELECT * FROM global_maintain_non_maintain_acl_before EXCEPT SELECT * FROM acl_after)
    UNION ALL
    (SELECT * FROM acl_after EXCEPT SELECT * FROM global_maintain_non_maintain_acl_before)
  )
  SELECT count(*) INTO acl_delta_count FROM delta;

  IF acl_delta_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_NON_MAINTAIN_ACL_DRIFT: %', acl_delta_count;
  END IF;

  WITH acl_after AS (
    SELECT
      coalesce(grantee.rolname, 'PUBLIC') AS grantee_name,
      grantor.rolname AS grantor_name,
      privilege.privilege_type,
      privilege.is_grantable
    FROM pg_catalog.pg_default_acl AS defaults
    JOIN pg_catalog.pg_roles AS owner
      ON owner.oid = defaults.defaclrole
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = defaults.defaclnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) AS privilege
    LEFT JOIN pg_catalog.pg_roles AS grantee
      ON grantee.oid = privilege.grantee
    JOIN pg_catalog.pg_roles AS grantor
      ON grantor.oid = privilege.grantor
    WHERE owner.rolname = 'postgres'
      AND namespace.nspname = 'public'
      AND defaults.defaclobjtype = 'r'
      AND privilege.privilege_type <> 'MAINTAIN'
  ), delta AS (
    (SELECT * FROM global_maintain_postgres_non_maintain_default_acl_before EXCEPT SELECT * FROM acl_after)
    UNION ALL
    (SELECT * FROM acl_after EXCEPT SELECT * FROM global_maintain_postgres_non_maintain_default_acl_before)
  )
  SELECT count(*) INTO acl_delta_count FROM delta;

  IF acl_delta_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_NON_MAINTAIN_DEFAULT_ACL_DRIFT: %',
      acl_delta_count;
  END IF;

  WITH acl_after AS (
    SELECT
      defaults.defaclobjtype,
      defaults.defaclacl::text AS acl
    FROM pg_catalog.pg_default_acl AS defaults
    JOIN pg_catalog.pg_roles AS owner
      ON owner.oid = defaults.defaclrole
    LEFT JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = defaults.defaclnamespace
    WHERE owner.rolname = 'supabase_admin'
      AND namespace.nspname = 'public'
  ), delta AS (
    (SELECT * FROM global_maintain_supabase_admin_default_acl_before EXCEPT SELECT * FROM acl_after)
    UNION ALL
    (SELECT * FROM acl_after EXCEPT SELECT * FROM global_maintain_supabase_admin_default_acl_before)
  )
  SELECT count(*) INTO acl_delta_count FROM delta;

  IF acl_delta_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_SUPABASE_ADMIN_DEFAULT_ACL_DRIFT: %', acl_delta_count;
  END IF;
END
$assertion$;

CREATE TABLE public.global_maintain_acl_postgres_fixture (
  id bigint PRIMARY KEY
);

DO $assertion$
DECLARE
  fixture_maintain_count integer;
BEGIN
  SELECT count(*)
  INTO fixture_maintain_count
  FROM pg_catalog.pg_class AS relation
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
  ) AS privilege
  JOIN pg_catalog.pg_roles AS grantee
    ON grantee.oid = privilege.grantee
  WHERE relation.oid = 'public.global_maintain_acl_postgres_fixture'::regclass
    AND grantee.rolname IN ('anon', 'authenticated', 'service_role')
    AND privilege.privilege_type = 'MAINTAIN';

  IF fixture_maintain_count <> 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_POSTGRES_FIXTURE_GRANT_PRESENT: %',
      fixture_maintain_count;
  END IF;
END
$assertion$;

INSERT INTO auth.users (id, email)
VALUES ('50000000-0000-0000-0000-000000000001', 'maintain-acl@test.invalid');
INSERT INTO public.profiles (id, email, role)
VALUES ('50000000-0000-0000-0000-000000000001', 'maintain-acl@test.invalid', 'client');

SET LOCAL ROLE service_role;
DO $service_role_test$
DECLARE
  entitlement_id uuid;
  visible_count integer;
BEGIN
  INSERT INTO public.legacy_entitlements (
    user_id, type, source, starts_at
  ) VALUES (
    '50000000-0000-0000-0000-000000000001',
    'legacy_invited_access',
    'support_reconciliation',
    now()
  ) RETURNING id INTO entitlement_id;

  SELECT count(*) INTO visible_count
  FROM public.legacy_entitlements
  WHERE id = entitlement_id;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_SERVICE_ROLE_DML_FAILED: SELECT';
  END IF;

  UPDATE public.legacy_entitlements
  SET metadata = '{"test":true}'::jsonb
  WHERE id = entitlement_id;
  DELETE FROM public.legacy_entitlements WHERE id = entitlement_id;
END
$service_role_test$;
RESET ROLE;

DO $m11_assertion$
DECLARE
  browser_role text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class
    WHERE oid = 'public.legacy_entitlements'::regclass
      AND relrowsecurity
      AND relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_M11_RLS_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.legacy_entitlements'::regclass
  ) THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_M11_BROWSER_POLICY_PRESENT';
  END IF;

  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF pg_catalog.has_table_privilege(
      browser_role, 'public.legacy_entitlements', 'SELECT'
    ) THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_M11_BROWSER_GRANT_PRESENT: %', browser_role;
    END IF;
  END LOOP;
END
$m11_assertion$;

DROP TABLE public.global_maintain_acl_postgres_fixture;
ROLLBACK;
