BEGIN;
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('progress-photos','00000000-0000-4000-8000-000000000001/photo.jpg'),
 ('progress-photos','00000000-0000-4000-8000-000000000002/photo.jpg'),
 ('progress-photos','invalid-folder/photo.jpg'),('avatars','public.jpg');
INSERT INTO public.coach_clients VALUES
 ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','active','invitation'),
 ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','ended','invitation');
-- Even a future broad permissive SELECT must not reopen progression photos.
CREATE POLICY synthetic_broad_read ON storage.objects FOR SELECT TO authenticated USING(true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='progress-photos')<>1 THEN RAISE EXCEPTION 'OWNER_ISOLATION_FAILED'; END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='avatars')<>1 THEN RAISE EXCEPTION 'OTHER_BUCKET_CHANGED'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='progress-photos' AND name LIKE '00000000-0000-4000-8000-000000000002/%';
 IF FOUND THEN RAISE EXCEPTION 'CROSS_ACCOUNT_DELETE'; END IF;
 INSERT INTO storage.objects(bucket_id,name) VALUES('progress-photos','00000000-0000-4000-8000-000000000001/new.jpg');
 DELETE FROM storage.objects WHERE name='00000000-0000-4000-8000-000000000001/new.jpg';
 IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_DELETE_DENIED'; END IF;
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('progress-photos','00000000-0000-4000-8000-000000000002/foreign.jpg');
  RAISE EXCEPTION 'CROSS_ACCOUNT_UPLOAD';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='progress-photos')<>1 THEN RAISE EXCEPTION 'ACTIVE_COACH_DENIED'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='progress-photos';
 IF FOUND THEN RAISE EXCEPTION 'COACH_DELETE_ALLOWED'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='progress-photos') THEN RAISE EXCEPTION 'FORMER_COACH_ALLOWED'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='progress-photos') THEN RAISE EXCEPTION 'ANONYMOUS_READ'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT public FROM storage.buckets WHERE id='progress-photos') THEN RAISE EXCEPTION 'BUCKET_STILL_PUBLIC'; END IF;
END $$;
ROLLBACK;
