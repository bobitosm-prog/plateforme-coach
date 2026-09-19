-- Synthetic metadata only. No image files or external Storage service.
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, public boolean NOT NULL DEFAULT false);
INSERT INTO storage.buckets VALUES ('progress-photos',true),('avatars',true);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
 SELECT string_to_array(name,'/')
$$;
CREATE TABLE public.coach_clients(coach_id uuid,client_id uuid,status text,source text);
CREATE FUNCTION public.is_active_coach_client_relation(coach_uuid uuid,client_uuid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.coach_clients r WHERE r.coach_id=coach_uuid AND r.client_id=client_uuid
   AND r.status='active' AND r.source IN ('invitation','admin'))
$$;
GRANT USAGE ON SCHEMA storage,auth TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
CREATE POLICY "clients can read progress photos" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='progress-photos');
CREATE POLICY "clients can upload progress photos" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='progress-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "public avatar read" ON storage.objects FOR SELECT USING(bucket_id='avatars');
