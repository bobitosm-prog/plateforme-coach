-- Roll out the trusted server writer BEFORE applying this migration.
-- service_role bypasses RLS; the narrow writer verifies identity, picks the path,
-- decodes and strips metadata. Do not reopen client writes as an app rollback.
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.buckets WHERE id IN ('avatars','progress-photos'))<>2 THEN
  RAISE EXCEPTION 'Photo buckets missing';
 END IF;
END $$;
DROP POLICY IF EXISTS photo_server_only_insert_v1 ON storage.objects;
CREATE POLICY photo_server_only_insert_v1 ON storage.objects AS RESTRICTIVE FOR INSERT TO public
 WITH CHECK (bucket_id NOT IN ('avatars','progress-photos'));
DROP POLICY IF EXISTS photo_server_only_update_v1 ON storage.objects;
CREATE POLICY photo_server_only_update_v1 ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
 USING (bucket_id NOT IN ('avatars','progress-photos'))
 WITH CHECK (bucket_id NOT IN ('avatars','progress-photos'));
-- SELECT and owner-only DELETE stay unchanged. Other buckets are not restricted here.
