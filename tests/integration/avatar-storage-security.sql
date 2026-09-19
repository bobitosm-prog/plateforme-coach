BEGIN;
CREATE UNIQUE INDEX synthetic_storage_key ON storage.objects(bucket_id,name);
-- Simulate an accidentally broad future grant: restrictive boundaries must win.
CREATE POLICY synthetic_broad_write ON storage.objects FOR ALL TO public USING(true) WITH CHECK(true);
INSERT INTO storage.objects(bucket_id,name) VALUES ('avatars','00000000-0000-4000-8000-000000000002/avatar.jpg');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
DO $$ DECLARE p text; BEGIN
 FOREACH p IN ARRAY ARRAY['00000000-0000-4000-8000-000000000001/avatar.jpg',
  'avatars/00000000-0000-4000-8000-000000000001/photo.jpg',
  'avatars/00000000-0000-4000-8000-000000000001.jpg'] LOOP
  INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',p);
  INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',p)
    ON CONFLICT(bucket_id,name) DO UPDATE SET name=excluded.name;
  DELETE FROM storage.objects WHERE bucket_id='avatars' AND name=p;
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_DELETE_FAILED'; END IF;
 END LOOP;
 UPDATE storage.objects SET name='stolen.jpg' WHERE bucket_id='avatars';
 IF FOUND THEN RAISE EXCEPTION 'FOREIGN_UPDATE_ALLOWED'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='avatars';
 IF FOUND THEN RAISE EXCEPTION 'FOREIGN_DELETE_ALLOWED'; END IF;
 FOREACH p IN ARRAY ARRAY['00000000-0000-4000-8000-000000000002/avatar.jpg','avatars/00000000-0000-4000-8000-000000000002.jpg',
   '00000000-0000-4000-8000-000000000001/../foreign.jpg','public.jpg'] LOOP
  BEGIN
   INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',p);
   RAISE EXCEPTION 'FOREIGN_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
 INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','00000000-0000-4000-8000-000000000001/rename.jpg');
 BEGIN
  UPDATE storage.objects SET name='00000000-0000-4000-8000-000000000002/rename.jpg' WHERE name LIKE '%/rename.jpg';
  RAISE EXCEPTION 'OWNER_REASSIGNMENT_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='avatars') THEN RAISE EXCEPTION 'PUBLIC_READ_BROKEN'; END IF;
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','anonymous.jpg');
  RAISE EXCEPTION 'ANONYMOUS_INSERT_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 DELETE FROM storage.objects WHERE bucket_id='avatars';
 IF FOUND THEN RAISE EXCEPTION 'ANONYMOUS_DELETE_ALLOWED'; END IF;
 UPDATE storage.objects SET name='anonymous.jpg' WHERE bucket_id='avatars';
 IF FOUND THEN RAISE EXCEPTION 'ANONYMOUS_UPDATE_ALLOWED'; END IF;
END $$;
ROLLBACK;
