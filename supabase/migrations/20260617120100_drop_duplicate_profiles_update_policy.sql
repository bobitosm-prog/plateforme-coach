-- Exécuté manuellement en prod le 17/06. Doublon de policy UPDATE sur profiles :
-- "Users can update own profile" (même logique que profiles_update_own). Supprimé.
drop policy if exists "Users can update own profile" on public.profiles;
