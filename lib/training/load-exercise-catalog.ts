/**
 * Load the exercise catalog from exercises_db.
 * Best-effort: returns [] on error, never throws.
 */
export async function loadExerciseCatalog(
  supabase: { from: (table: string) => any }
): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('exercises_db')
      .select('id, name')
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
