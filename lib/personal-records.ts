interface SetData { weight: number; reps: number }
interface PRResult { type: 'weight' | 'reps' | 'volume'; value: number; previous: number | null; isNew: boolean }

export function detectPRs(exerciseName: string, completedSets: SetData[], existingRecords: { record_type: string; value: number }[]): PRResult[] {
  const results: PRResult[] = []
  if (!completedSets.length) return results
  const maxWeight = Math.max(...completedSets.map(s => s.weight))
  const prevWeight = existingRecords.find(r => r.record_type === 'weight')?.value || 0
  if (maxWeight > prevWeight && maxWeight > 0) results.push({ type: 'weight', value: maxWeight, previous: prevWeight || null, isNew: true })
  const maxReps = Math.max(...completedSets.filter(s => s.weight === maxWeight).map(s => s.reps))
  const prevReps = existingRecords.find(r => r.record_type === 'reps')?.value || 0
  if (maxReps > prevReps && maxReps > 0) results.push({ type: 'reps', value: maxReps, previous: prevReps || null, isNew: true })
  const maxVolume = Math.max(...completedSets.map(s => s.weight * s.reps))
  const prevVolume = existingRecords.find(r => r.record_type === 'volume')?.value || 0
  if (maxVolume > prevVolume && maxVolume > 0) results.push({ type: 'volume', value: maxVolume, previous: prevVolume || null, isNew: true })
  return results
}

export async function savePRs(userId: string, exerciseName: string, prs: PRResult[], supabase: any) {
  for (const pr of prs) {
    if (!pr.isNew) continue
    await supabase.from('personal_records').upsert({
      user_id: userId, exercise_name: exerciseName, record_type: pr.type,
      value: pr.value, previous_value: pr.previous, achieved_at: new Date().toISOString(),
    }, { onConflict: 'user_id, exercise_name, record_type' })
  }
}
