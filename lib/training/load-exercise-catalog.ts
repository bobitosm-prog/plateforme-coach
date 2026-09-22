/**
 * Load the exercise catalog from exercises_db.
 * Best-effort: returns [] on error, never throws.
 */
import type { CatalogExercise } from './equipment-contract'

export async function loadExerciseCatalog(
  supabase: { from: (table: string) => any }
): Promise<CatalogExercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises_catalog')
      .select('id, name, equipment, equipment_legacy')
    if (error) {
      console.warn('[loadExerciseCatalog] DB error:', error.message)
      return []
    }
    return (data || []).filter((d: any) => d.id && d.name)
  } catch (e: any) {
    console.warn('[loadExerciseCatalog] Unexpected error:', e.message)
    return []
  }
}
