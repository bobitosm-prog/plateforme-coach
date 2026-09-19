BEGIN;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO service_role;
CREATE UNIQUE INDEX synthetic_photo_key ON storage.objects(bucket_id,name);
CREATE POLICY synthetic_broad_photos ON storage.objects FOR ALL TO public USING(true) WITH CHECK(true);
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('avatars','00000000-0000-4000-8000-000000000001/old.jpg'),
 ('progress-photos','00000000-0000-4000-8000-000000000001/old.jpg');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
DO $$ DECLARE b text; BEGIN
 FOREACH b IN ARRAY ARRAY['avatars','progress-photos'] LOOP
  BEGIN
   INSERT INTO storage.objects(bucket_id,name) VALUES(b,'00000000-0000-4000-8000-000000000001/new.jpg');
   RAISE EXCEPTION 'DIRECT_OWNER_UPLOAD_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   INSERT INTO storage.objects(bucket_id,name) VALUES(b,'00000000-0000-4000-8000-000000000001/old.jpg')
    ON CONFLICT(bucket_id,name) DO UPDATE SET name=excluded.name;
   RAISE EXCEPTION 'DIRECT_UPSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE storage.objects SET name='00000000-0000-4000-8000-000000000001/moved.jpg' WHERE bucket_id=b;
  IF FOUND THEN RAISE EXCEPTION 'DIRECT_UPDATE_ALLOWED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=b) THEN RAISE EXCEPTION 'OWNER_READ_BROKEN'; END IF;
 END LOOP;
 INSERT INTO storage.objects(bucket_id,name) VALUES('unrelated','other.jpg');
 BEGIN
  UPDATE storage.objects SET bucket_id='avatars',name='00000000-0000-4000-8000-000000000001/moved.jpg' WHERE bucket_id='unrelated';
  RAISE EXCEPTION 'CROSS_BUCKET_MOVE_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 DELETE FROM storage.objects WHERE bucket_id IN ('avatars','progress-photos');
 IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_DELETE_BROKEN'; END IF;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
DO $$ BEGIN
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('progress-photos','anonymous.jpg');
  RAISE EXCEPTION 'ANONYMOUS_UPLOAD_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE service_role;
INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','00000000-0000-4000-8000-000000000001/server.jpg');
UPDATE storage.objects SET name='00000000-0000-4000-8000-000000000001/sanitized.jpg' WHERE bucket_id='avatars';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE name LIKE '%/sanitized.jpg') THEN RAISE EXCEPTION 'TRUSTED_WRITE_BROKEN'; END IF;
END $$;
ROLLBACK;
