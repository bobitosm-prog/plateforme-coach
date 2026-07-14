\set ON_ERROR_STOP on
WITH facts AS (
  SELECT format('relation|%s|%s|%s', n.nspname, c.relname, c.relkind) AS value
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'auth') AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  UNION ALL
  SELECT format('column|%s|%s|%s|%s|%s|%s', table_schema, table_name, ordinal_position, column_name, data_type, is_nullable)
  FROM information_schema.columns WHERE table_schema IN ('public', 'auth')
  UNION ALL
  SELECT format('constraint|%s|%s', conrelid::regclass::text, pg_get_constraintdef(oid, true))
  FROM pg_constraint WHERE connamespace IN ('public'::regnamespace, 'auth'::regnamespace)
  UNION ALL
  SELECT format('index|%s', pg_get_indexdef(i.indexrelid))
  FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'auth')
  UNION ALL
  SELECT format('function|%s|%s|%s', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'auth')
  UNION ALL
  SELECT format('policy|%s|%s|%s|%s|%s', schemaname, tablename, policyname, cmd, coalesce(qual, ''))
  FROM pg_policies WHERE schemaname IN ('public', 'auth')
  UNION ALL
  SELECT format('migration|%s|%s', ordinal, filename)
  FROM supabase_migrations.local_applied_files
)
SELECT md5(string_agg(value, E'\n' ORDER BY value)) AS fingerprint FROM facts;
