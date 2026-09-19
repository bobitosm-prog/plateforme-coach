-- Preserve public avatar reads and all three historical owner path layouts.
-- Restrictive boundaries remain effective if another permissive policy is added.
DO $$
DECLARE
  p text;
  own text := $rule$coalesce((select auth.uid()) IS NOT NULL AND (
    name ~ ('^' || (select auth.uid())::text || '/[^/].*$')
    OR name ~ ('^avatars/' || (select auth.uid())::text || '/[^/].*$')
    OR name ~ ('^avatars/' || (select auth.uid())::text || '\.[a-zA-Z0-9]+$')
  ) AND name !~ '(^|/)\.{1,2}(/|$)',false)$rule$;
  allowed text;
  boundary text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='avatars') THEN
    RAISE EXCEPTION 'avatars bucket missing';
  END IF;
  FOREACH p IN ARRAY ARRAY['Users can upload avatars','users can upload avatar',
    'Users can update avatars','Users can update their avatar',
    'Users can delete avatars','Users can delete their avatar'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',p);
  END LOOP;
  allowed := '(bucket_id=''avatars'' AND (' || own || '))';
  boundary := '(bucket_id<>''avatars'' OR (' || own || '))';
  FOREACH p IN ARRAY ARRAY['insert','update','delete'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','avatars_owner_'||p||'_v1');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','avatars_write_boundary_'||p||'_v1');
    IF p='insert' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (%s)','avatars_owner_'||p||'_v1',allowed);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK (%s)','avatars_write_boundary_'||p||'_v1',boundary);
    ELSIF p='update' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)','avatars_owner_'||p||'_v1',allowed,allowed);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING (%s) WITH CHECK (%s)','avatars_write_boundary_'||p||'_v1',boundary,boundary);
    ELSE
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (%s)','avatars_owner_'||p||'_v1',allowed);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING (%s)','avatars_write_boundary_'||p||'_v1',boundary);
    END IF;
  END LOOP;
END $$;
