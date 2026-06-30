-- Aligner les types coach sur le code (labels texte). Colonnes vides -> conversion sans risque.
alter table profiles alter column coach_speciality type text using coach_speciality::text;
alter table profiles alter column coach_experience_years type text using coach_experience_years::text;
