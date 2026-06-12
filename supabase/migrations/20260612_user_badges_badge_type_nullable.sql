-- Exécuté manuellement en prod le 12/06. Cause racine de la coquille
-- vide badges : badge_type NOT NULL sans default, jamais renseigné par
-- checkAndUnlockBadges → chaque insert échouait en 23502 avalé par
-- if(!error). AUCUN badge n'avait jamais été écrit pour aucun user.
-- Dette associée : contrainte UNIQUE(user_id, badge_type) devenue inerte
-- (badge_type NULL) — à supprimer avec la colonne dans une migration future.
ALTER TABLE user_badges ALTER COLUMN badge_type DROP NOT NULL;
