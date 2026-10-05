"""Build the reviewed migration from the archived ANSES XML and local name mapping.
Usage: python3 scripts/catalogue/build-ciqual-migration.py EXPORT_DIRECTORY MIGRATION_FILE
No credentials or database writes. Matches names, never environment-specific IDs.
"""
import json, sys, xml.etree.ElementTree as ET
from pathlib import Path
root, target = map(Path, sys.argv[1:])
mapping = json.loads((root/'ciqual-2025-name-mapping.json').read_text())
values = {}
fields = {'328':'energy_kcal','25000':'proteins','31000':'carbohydrates','40000':'fat'}
for _, node in ET.iterparse(root/'anses-ciqual-2025-composition.xml', events=['end']):
    if node.tag == 'COMPO':
        key = node.findtext('const_code').strip()
        if key in fields:
            values.setdefault(node.findtext('alim_code').strip(), {})[fields[key]] = (node.findtext('teneur') or '').strip()
        node.clear()
rows = [{'name':x['name'],'code':x['ciqual_code'],'raw':values[x['ciqual_code']]} for x in mapping if x['ciqual_code']]
assert len(rows) == 3484 and len({x['name'] for x in rows}) == 3484
payload=json.dumps(rows,ensure_ascii=False,separators=(',',':'))
assert '$ciqual$' not in payload
sql='''-- ANSES. 2025. Table de composition nutritionnelle des aliments Ciqual.
-- https://doi.org/10.57745/RDMHWY — Licence Ouverte / Etalab 2.0.
-- Derived four-nutrient subset; names retain the existing import punctuation.
-- Missing values stay NULL; traces approximate zero; thresholds use their upper
-- bound for calculations. Original strings remain available for attribution/audit.
-- No log, saved meal, profile or historical snapshot is modified.
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS ciqual_code text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS source_version text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS source_license text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS nutrients_raw jsonb;
CREATE TEMP TABLE ciqual_reference ON COMMIT DROP AS
SELECT x.name, x.code, x.raw FROM jsonb_to_recordset($ciqual$'''+payload+'''$ciqual$::jsonb) AS x(name text, code text, raw jsonb);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.food_items f JOIN ciqual_reference r ON r.name=f.name
             WHERE f.source='ANSES' GROUP BY f.name HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate ANSES names: review before importing';
  END IF;
END $$;
UPDATE public.food_items f SET ciqual_code=r.code, source_version='2025',
 source_url='https://doi.org/10.57745/RDMHWY', source_license='Etalab-2.0', nutrients_raw=r.raw
FROM ciqual_reference r WHERE f.source='ANSES' AND f.name=r.name;
'''
for column in fields.values():
    raw=f"replace(trim(nutrients_raw->>'{column}'), ',', '.')"
    sql+=f'''UPDATE public.food_items SET {column}=CASE
 WHEN {raw} ~ '^[0-9]+(\\.[0-9]+)?$' THEN ({raw})::double precision
 WHEN {raw} ~ '^< *[0-9]+(\\.[0-9]+)?$' THEN trim(replace({raw},'<',''))::double precision
 WHEN lower({raw})='traces' THEN 0
 ELSE NULL END
WHERE source='ANSES' AND source_version='2025' AND ciqual_code IS NOT NULL;
'''
# Preserve unmatched nutrition values for audit; exclude them from new selections.
sql+='''UPDATE public.food_items SET source='unverified'
WHERE source='ANSES' AND NOT EXISTS (SELECT 1 FROM ciqual_reference r WHERE r.name=food_items.name);
CREATE OR REPLACE VIEW public.selectable_food_items WITH (security_invoker=true) AS
SELECT * FROM public.food_items
WHERE source IN ('ANSES','fitness','coach')
 AND energy_kcal IS NOT NULL AND proteins IS NOT NULL
 AND carbohydrates IS NOT NULL AND fat IS NOT NULL
 AND energy_kcal >= 0 AND proteins >= 0 AND carbohydrates >= 0 AND fat >= 0;
REVOKE ALL ON public.selectable_food_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.selectable_food_items TO anon, authenticated, service_role;
COMMENT ON VIEW public.selectable_food_items IS 'Complete nutrition references for new selections; inherits food_items RLS. Original incomplete rows remain in food_items.';
'''
target.write_text(sql)
print(f'Generated {len(rows)} references, {len(sql)} characters')
