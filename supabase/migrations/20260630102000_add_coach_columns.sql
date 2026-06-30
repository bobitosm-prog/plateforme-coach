-- Colonnes coach manquantes (schema drift : le code les écrivait sans qu'elles existent).
alter table profiles add column if not exists coach_max_clients integer;
alter table profiles add column if not exists coach_available_days text[];
