import { buildProgressionHistoryReadModel } from '@/lib/progression/read-models'
import { createTrainingSessionRepository } from '@/lib/repositories/training/session'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { ClientDetailLoadResult, ClientDetailMeasurement, ClientDetailPhoto, ClientDetailScope, ClientDetailWeightLog } from './types'

export interface ClientDetailProgressionData {
  readonly weights: readonly ClientDetailWeightLog[]
  readonly measurements: readonly ClientDetailMeasurement[]
  readonly photos: readonly ClientDetailPhoto[]
  readonly completions: readonly { readonly id: string; readonly session_index: number; readonly session_name: string | null; readonly completed_at: string | null; readonly duration_minutes: number | null }[]
}

export async function loadClientDetailProgression(client: DatabaseClient, scope: ClientDetailScope): Promise<ClientDetailLoadResult<ClientDetailProgressionData>> {
  const sessions = createTrainingSessionRepository(client)
  const [weights, measurements, photos, completions] = await Promise.all([
    client.from('weight_logs').select('id,date,poids').eq('user_id', scope.clientUserId).order('date', { ascending: true }).limit(90),
    client.from('body_measurements').select('id,date,chest,waist,hips,biceps,thighs,calves,created_at').eq('user_id', scope.clientUserId).order('date', { ascending: false }).limit(10),
    client.from('progress_photos').select('id,date,photo_url,view_type,created_at,adjustments,ai_analysis,ai_analyzed_at').eq('user_id', scope.clientUserId).order('created_at', { ascending: false }).limit(20),
    sessions.listCompletionsForClient(scope.clientUserId),
  ])
  if (weights.error || measurements.error || photos.error || !completions.ok) return { status: 'unavailable', source: 'progression' }

  const scopedCompletions = completions.data.filter(row => row.coach_id === scope.coachUserId).slice(0, 50)
  const history = buildProgressionHistoryReadModel({
    weights: (weights.data ?? []).map(row => ({ date: row.date, weight: row.poids })),
    measurements: measurements.data ?? [], records: [], workoutSessions: [], completionMarkers: scopedCompletions, scheduledSessions: [],
  })
  const signedPhotos = await Promise.all((photos.data ?? []).map(async photo => {
    const signed = await client.storage.from('progress-photos').createSignedUrl(photo.photo_url, 3600)
    return { ...photo, signedUrl: signed.data?.signedUrl ?? null }
  }))
  return {
    status: 'success',
    data: {
      weights: history.weights.map((row, index) => ({ id: weights.data?.[index]?.id ?? `weight-${index}`, date: row.date, poids: row.weight })),
      measurements: history.measurements,
      photos: signedPhotos,
      completions: history.completionMarkers.map(({ id, session_index, session_name, completed_at, duration_minutes }) => ({ id, session_index, session_name, completed_at, duration_minutes })),
    },
  }
}
