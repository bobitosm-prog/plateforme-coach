-- Exercise variant groups + equipment
ALTER TABLE exercises_db ADD COLUMN IF NOT EXISTS variant_group TEXT;
ALTER TABLE exercises_db ADD COLUMN IF NOT EXISTS equipment TEXT;

-- Squat
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Barre' WHERE name ILIKE '%squat%barre%' OR name ILIKE '%back squat%';
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Machine' WHERE name ILIKE '%squat%machine%' OR name ILIKE '%hack squat%' OR name ILIKE '%smith%squat%';
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Haltères' WHERE name ILIKE '%goblet%' OR name ILIKE '%squat%haltère%' OR name ILIKE '%squat%dumbbell%';
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Poids du corps' WHERE name ILIKE '%squat%poids%corps%' OR name = 'Squat';
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Barre' WHERE name ILIKE '%squat bulgare%';
UPDATE exercises_db SET variant_group = 'squat', equipment = 'Machine' WHERE name ILIKE '%presse%' OR name ILIKE '%leg press%';

-- Développé couché
UPDATE exercises_db SET variant_group = 'dev_couche', equipment = 'Barre' WHERE name ILIKE '%développé couché%barre%' OR name = 'Développé couché';
UPDATE exercises_db SET variant_group = 'dev_couche', equipment = 'Haltères' WHERE name ILIKE '%développé couché%haltère%';
UPDATE exercises_db SET variant_group = 'dev_couche', equipment = 'Machine' WHERE name ILIKE '%développé couché%machine%' OR name ILIKE '%chest press%';

-- Développé incliné
UPDATE exercises_db SET variant_group = 'dev_incline', equipment = 'Barre' WHERE name ILIKE '%incliné%barre%';
UPDATE exercises_db SET variant_group = 'dev_incline', equipment = 'Haltères' WHERE name ILIKE '%incliné%haltère%';
UPDATE exercises_db SET variant_group = 'dev_incline', equipment = 'Machine' WHERE name ILIKE '%incliné%machine%';

-- Rowing
UPDATE exercises_db SET variant_group = 'rowing', equipment = 'Barre' WHERE name ILIKE '%rowing%barre%' OR name = 'Rowing barre';
UPDATE exercises_db SET variant_group = 'rowing', equipment = 'Haltères' WHERE name ILIKE '%rowing%haltère%' OR name ILIKE '%rowing%un bras%';
UPDATE exercises_db SET variant_group = 'rowing', equipment = 'Machine' WHERE name ILIKE '%rowing%machine%' OR name ILIKE '%rowing%poulie%';
UPDATE exercises_db SET variant_group = 'rowing', equipment = 'T-bar' WHERE name ILIKE '%t-bar%' OR name ILIKE '%rowing%t bar%';

-- Stiff / Romanian deadlift
UPDATE exercises_db SET variant_group = 'stiff', equipment = 'Barre' WHERE name ILIKE '%stiff%barre%' OR name ILIKE '%soulevé%jambes%tendues%barre%' OR name = 'Stiff leg deadlift';
UPDATE exercises_db SET variant_group = 'stiff', equipment = 'Haltères' WHERE name ILIKE '%stiff%haltère%' OR name ILIKE '%soulevé%jambes%tendues%haltère%' OR name ILIKE '%romanian%haltère%';
UPDATE exercises_db SET variant_group = 'deadlift', equipment = 'Barre' WHERE name ILIKE '%soulevé de terre%' AND name NOT ILIKE '%jambes%tendues%' AND name NOT ILIKE '%roumain%';
UPDATE exercises_db SET variant_group = 'deadlift', equipment = 'Haltères' WHERE name ILIKE '%deadlift%haltère%';

-- Curl biceps
UPDATE exercises_db SET variant_group = 'curl', equipment = 'Barre' WHERE name ILIKE '%curl%barre%';
UPDATE exercises_db SET variant_group = 'curl', equipment = 'Haltères' WHERE name ILIKE '%curl%haltère%' AND name NOT ILIKE '%concentr%' AND name NOT ILIKE '%marteau%';
UPDATE exercises_db SET variant_group = 'curl', equipment = 'Poulie' WHERE name ILIKE '%curl%poulie%';
UPDATE exercises_db SET variant_group = 'curl_marteau', equipment = 'Haltères' WHERE name ILIKE '%marteau%' OR name ILIKE '%hammer%';
UPDATE exercises_db SET variant_group = 'curl_concentre', equipment = 'Haltères' WHERE name ILIKE '%concentr%';
UPDATE exercises_db SET variant_group = 'curl_pupitre', equipment = 'Barre' WHERE name ILIKE '%pupitre%barre%' OR name ILIKE '%larry%barre%';
UPDATE exercises_db SET variant_group = 'curl_pupitre', equipment = 'Haltères' WHERE name ILIKE '%pupitre%haltère%' OR name ILIKE '%larry%haltère%';

-- Extension triceps
UPDATE exercises_db SET variant_group = 'ext_triceps', equipment = 'Poulie' WHERE name ILIKE '%extension%poulie%' OR name ILIKE '%pushdown%';
UPDATE exercises_db SET variant_group = 'ext_triceps', equipment = 'Haltères' WHERE name ILIKE '%extension%haltère%' OR name ILIKE '%kickback%';
UPDATE exercises_db SET variant_group = 'ext_triceps', equipment = 'Barre' WHERE name ILIKE '%barre au front%' OR name ILIKE '%skull%';

-- Élévations latérales
UPDATE exercises_db SET variant_group = 'elev_lat', equipment = 'Haltères' WHERE name ILIKE '%élévation%latérale%haltère%' OR name = 'Élévations latérales haltères';
UPDATE exercises_db SET variant_group = 'elev_lat', equipment = 'Poulie' WHERE name ILIKE '%élévation%latérale%poulie%';
UPDATE exercises_db SET variant_group = 'elev_lat', equipment = 'Machine' WHERE name ILIKE '%élévation%latérale%machine%';

-- Développé militaire
UPDATE exercises_db SET variant_group = 'dev_militaire', equipment = 'Barre' WHERE name ILIKE '%militaire%barre%' OR name ILIKE '%overhead press%barre%';
UPDATE exercises_db SET variant_group = 'dev_militaire', equipment = 'Haltères' WHERE name ILIKE '%militaire%haltère%' OR name ILIKE '%arnold%';
UPDATE exercises_db SET variant_group = 'dev_militaire', equipment = 'Machine' WHERE name ILIKE '%militaire%machine%' OR name ILIKE '%shoulder press%machine%';

-- Leg curl
UPDATE exercises_db SET variant_group = 'leg_curl', equipment = 'Machine' WHERE name ILIKE '%leg curl%';

-- Leg extension
UPDATE exercises_db SET variant_group = 'leg_ext', equipment = 'Machine' WHERE name ILIKE '%leg extension%' OR name ILIKE '%extension%jambe%';

-- Écartés
UPDATE exercises_db SET variant_group = 'ecarte', equipment = 'Haltères' WHERE name ILIKE '%écarté%haltère%';
UPDATE exercises_db SET variant_group = 'ecarte', equipment = 'Poulie' WHERE name ILIKE '%écarté%poulie%' OR name ILIKE '%cable fly%';
UPDATE exercises_db SET variant_group = 'ecarte', equipment = 'Machine' WHERE name ILIKE '%pec deck%' OR name ILIKE '%butterfly%';

-- Hip thrust
UPDATE exercises_db SET variant_group = 'hip_thrust', equipment = 'Barre' WHERE name ILIKE '%hip thrust%barre%' OR name = 'Hip thrust';
UPDATE exercises_db SET variant_group = 'hip_thrust', equipment = 'Machine' WHERE name ILIKE '%hip thrust%machine%';
UPDATE exercises_db SET variant_group = 'hip_thrust', equipment = 'Haltères' WHERE name ILIKE '%hip thrust%haltère%';

-- Tractions / Tirage vertical
UPDATE exercises_db SET variant_group = 'traction', equipment = 'Poids du corps' WHERE name ILIKE '%traction%' AND name NOT ILIKE '%poulie%' AND name NOT ILIKE '%machine%';
UPDATE exercises_db SET variant_group = 'traction', equipment = 'Machine' WHERE name ILIKE '%tirage%vertical%' OR name ILIKE '%lat pulldown%' OR name ILIKE '%tirage%poitrine%';

-- Dips
UPDATE exercises_db SET variant_group = 'dips', equipment = 'Poids du corps' WHERE name ILIKE '%dips%' AND name NOT ILIKE '%machine%';
UPDATE exercises_db SET variant_group = 'dips', equipment = 'Machine' WHERE name ILIKE '%dips%machine%';

-- Fentes
UPDATE exercises_db SET variant_group = 'fente', equipment = 'Poids du corps' WHERE name ILIKE '%fente%' AND name NOT ILIKE '%haltère%' AND name NOT ILIKE '%barre%';
UPDATE exercises_db SET variant_group = 'fente', equipment = 'Haltères' WHERE name ILIKE '%fente%haltère%';
UPDATE exercises_db SET variant_group = 'fente', equipment = 'Barre' WHERE name ILIKE '%fente%barre%';

-- Mollets
UPDATE exercises_db SET variant_group = 'mollet', equipment = 'Machine' WHERE name ILIKE '%mollet%machine%' OR name ILIKE '%calf%machine%';
UPDATE exercises_db SET variant_group = 'mollet', equipment = 'Debout' WHERE name ILIKE '%mollet%debout%';
UPDATE exercises_db SET variant_group = 'mollet', equipment = 'Assis' WHERE name ILIKE '%mollet%assis%';

CREATE INDEX IF NOT EXISTS idx_exercises_db_variant_group ON exercises_db(variant_group);
