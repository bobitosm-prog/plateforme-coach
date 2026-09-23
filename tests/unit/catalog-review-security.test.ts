import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOG_REVIEW_NAMES, requiresCatalogReview } from '@/lib/training/catalog-review'
import { generationCatalog, isCatalogExerciseCompatible } from '@/lib/training/equipment-contract'
import { normalizeEquipment, isHomeFriendly } from '@/lib/training/equipment-normalize'
import { defaultLoadMode, setTonnage } from '@/lib/training/load-volume'

describe('Shared catalog review and write boundaries',()=>{
 it.each(CATALOG_REVIEW_NAMES)('holds %s without relabeling historical identity',name=>{
   expect(requiresCatalogReview(name.toUpperCase())).toBe(true)
   expect(generationCatalog([{id:'legacy',name,equipment:'barbell'}],'salle')).toEqual([])
 })
 it('keeps explicit alternatives selectable, with their actual equipment',()=>{
   for(const name of ['Rowing barre buste penché','Rowing haltère un bras','Développé militaire barre debout','Face pull poulie corde','Soulevé de terre jambes tendues'])
     expect(requiresCatalogReview(name)).toBe(false)
 })
 it('never treats a wheel or battle rope as an elastic band',()=>{
   expect(normalizeEquipment('Roue abdominale')).toBe('ab_wheel')
   expect(normalizeEquipment('Cordes')).toBe('battle_rope')
   expect(isHomeFriendly('ab_wheel')).toBe(false)
   expect(defaultLoadMode({name:'Battle Ropes'})).toBe('unquantified')
   expect(defaultLoadMode({name:'Ab Roller'})).toBe('unquantified')
   expect(setTonnage({weight:80,reps:10,loadMode:'unquantified'})).toBe(0)
   for(const equipment of ['ab_wheel','battle_rope'])
     expect(isCatalogExerciseCompatible({id:'x',name:'Accessory',equipment},'maison élastiques')).toBe(false)
 })
 it('quarantines exactly the reviewed legacy names in SQL',()=>{
   const sql=readFileSync('supabase/migrations/20260923033757_catalog_variant_review.sql','utf8')
   for(const name of CATALOG_REVIEW_NAMES) expect(sql).toContain(`'${name}'`)
   expect(sql).toContain('canonical_exercise_id is null and catalog_review_note is null')
   expect(sql).not.toMatch(/delete from/i)
 })
 it('keeps private exercise creation out of the shared catalog',()=>{
   const code=readFileSync('app/components/training/ProgramBuilder.tsx','utf8')
   expect(code).toContain("from('custom_exercises').insert")
   expect(code).toContain('is_private: true')
 })
 it('does not substitute a shared first-word match for a reviewed family',()=>{
   for(const file of ['app/components/training/ProgramBuilder.tsx','app/(application)/client/[id]/hooks/useClientDetail.ts','app/components/WorkoutSession.tsx']) {
     const code=readFileSync(file,'utf8')
     expect(code).not.toContain("const baseName = exerciseName.split")
     expect(code).not.toContain("const baseName = exo.name.split")
   }
 })
})
