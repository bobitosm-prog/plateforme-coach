BEGIN;

DO $preflight$
DECLARE
  required_role text;
  version_number integer;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_REQUIRES_POSTGRES_OWNER: %', current_user;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace
    WHERE nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_REQUIRES_PUBLIC_SCHEMA';
  END IF;

  FOREACH required_role IN ARRAY ARRAY[
    'postgres', 'anon', 'authenticated', 'service_role'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles
      WHERE rolname = required_role
    ) THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_REQUIRES_ROLE: %', required_role;
    END IF;
  END LOOP;

  version_number := current_setting('server_version_num')::integer;
  IF version_number <= 0 THEN
    RAISE EXCEPTION 'GLOBAL_MAINTAIN_SERVER_VERSION_UNAVAILABLE';
  END IF;
END
$preflight$;

-- MAINTAIN was introduced in PostgreSQL 17. Keeping the complete statements
-- inside constant dynamic SQL makes this migration parse and run as a no-op on
-- PostgreSQL 15 while applying the narrow revocation on PostgreSQL 17+.
DO $maintain$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE
      'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public
       FROM anon, authenticated, service_role';

    -- Application migrations create public tables as postgres. Only that
    -- creator's default ACL belongs to this application-scoped contract.
    EXECUTE
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
       REVOKE MAINTAIN ON TABLES FROM anon, authenticated, service_role';
  END IF;
END
$maintain$;

-- Supabase owns the supabase_admin default ACL as a platform baseline. It is
-- deliberately excluded: changing it would exceed the application contract,
-- and application migrations do not create their public tables as that role.
DO $postflight$
DECLARE
  existing_maintain_count integer;
  postgres_default_maintain_count integer;
  owner_maintain_missing_count integer;
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    SELECT count(*)
    INTO existing_maintain_count
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r', relation.relowner)
      )
    ) AS privilege
    JOIN pg_catalog.pg_roles AS grantee
      ON grantee.oid = privilege.grantee
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND grantee.rolname IN ('anon', 'authenticated', 'service_role')
      AND privilege.privilege_type = 'MAINTAIN';

    IF existing_maintain_count <> 0 THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_EXISTING_TABLE_GRANT_REMAINS: %',
        existing_maintain_count;
    END IF;

    SELECT count(*)
    INTO postgres_default_maintain_count
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

    IF postgres_default_maintain_count <> 0 THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_POSTGRES_DEFAULT_GRANT_REMAINS: %',
        postgres_default_maintain_count;
    END IF;

    SELECT count(*)
    INTO owner_maintain_missing_count
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND relation.relowner = (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'
      )
      AND NOT pg_catalog.has_table_privilege(
        'postgres',
        pg_catalog.format('%I.%I', namespace.nspname, relation.relname),
        'MAINTAIN'
      );

    IF owner_maintain_missing_count <> 0 THEN
      RAISE EXCEPTION 'GLOBAL_MAINTAIN_POSTGRES_OWNER_PRIVILEGE_MISSING: %',
        owner_maintain_missing_count;
    END IF;
  END IF;
END
$postflight$;

COMMIT;
