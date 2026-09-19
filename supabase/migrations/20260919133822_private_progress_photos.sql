-- Restrict only progress photos; preserve other buckets and active-coach semantics.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='progress-photos') THEN
   RAISE EXCEPTION 'Expected progress-photos bucket is missing';
 END IF;
END $$;
UPDATE storage.buckets SET public=false WHERE id='progress-photos';
DROP POLICY IF EXISTS "clients can read progress photos" ON storage.objects;
DROP POLICY IF EXISTS "progress_photos_authorized_read_v1" ON storage.objects;
CREATE POLICY "progress_photos_authorized_read_v1" ON storage.objects
 FOR SELECT TO authenticated USING (
   bucket_id='progress-photos' AND (
     (storage.foldername(name))[1]=auth.uid()::text
     OR CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN public.is_active_coach_client_relation(auth.uid(),((storage.foldername(name))[1])::uuid)
       ELSE false END
   )
 );
-- Defense against a future permissive policy accidentally reopening this bucket.
DROP POLICY IF EXISTS "progress_photos_read_boundary_v1" ON storage.objects;
CREATE POLICY "progress_photos_read_boundary_v1" ON storage.objects AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
   bucket_id<>'progress-photos' OR (
     (storage.foldername(name))[1]=auth.uid()::text
     OR CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN public.is_active_coach_client_relation(auth.uid(),((storage.foldername(name))[1])::uuid)
       ELSE false END
   )
 );
DROP POLICY IF EXISTS "progress_photos_owner_delete_v1" ON storage.objects;
CREATE POLICY "progress_photos_owner_delete_v1" ON storage.objects
 FOR DELETE TO authenticated USING (bucket_id='progress-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
COMMIT;
