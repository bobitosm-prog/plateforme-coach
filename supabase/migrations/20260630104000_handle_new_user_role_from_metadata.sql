-- Fix racine : handle_new_user pose le role depuis le metadata du signup.
-- Avant, le role non posé tombait sur le DEFAULT 'client' -> les coachs devenaient 'client'.
-- Garde : n'accepte que client/coach depuis metadata (jamais admin) ; ne jamais écraser un role existant.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meta_role text := NEW.raw_user_meta_data->>'role';
  v_role text;
BEGIN
  v_role := CASE WHEN v_meta_role IN ('client', 'coach') THEN v_meta_role ELSE 'client' END;
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, v_role)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = COALESCE(profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$function$;
