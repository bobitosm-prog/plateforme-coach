-- Exécuté manuellement en prod le 12/06 (fix upserts checkForPR
-- qui échouaient en silence — colonne absente du schéma)
ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'kg';
