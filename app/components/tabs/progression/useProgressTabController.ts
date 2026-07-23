import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { buildProgressionSummaryReadModel } from '../../../../lib/progression'
import type { Alignment } from '../../../../lib/photo-align'
import type { ProgressBodyAnalysis, ProgressCheckin, ProgressMeasurement, ProgressTabPublicProps, ProgressTranslate, ProgressWeight } from './progress-tab-types'

const EMPTY_MEASURES = { waist: '', hips: '', chest: '', arms: '', thighs: '' }
interface BodyAnalysisResponse extends ProgressBodyAnalysis { readonly error?: string }

export function useProgressTabController(props: ProgressTabPublicProps, t: ProgressTranslate) {
  const userId = props.session?.user?.id
  const [activePill, setActivePill] = useState<import('./types').ProgressSectionId>('poids')
  const [weightPeriod, setWeightPeriod] = useState<'7' | '30' | '90' | 'all'>('30')
  const [recordsLimit, setRecordsLimit] = useState(10)
  const [showAssessment, setShowAssessment] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareIdx, setCompareIdx] = useState<[number, number]>([0, 0])
  const [sliderValue, setSliderValue] = useState(50)
  const [alignment, setAlignment] = useState<{ before: Alignment; after: Alignment } | null>(null)
  const [isAligning, setIsAligning] = useState(false)
  const [alignError, setAlignError] = useState<string | null>(null)
  const [checkinData, setCheckinData] = useState<ProgressCheckin[]>([])
  const [checkinPeriod, setCheckinPeriod] = useState(7)
  const [viewNow] = useState(() => new Date())
  const [showWeight, setShowWeight] = useState(false)
  const [weightVal, setWeightVal] = useState('')
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingWeight, setSavingWeight] = useState(false)
  const [localWeights, setLocalWeights] = useState<ProgressWeight[]>([])
  const [showMeasure, setShowMeasure] = useState(false)
  const [measureForm, setMeasureForm] = useState<Record<string, string>>(EMPTY_MEASURES)
  const [measureDate, setMeasureDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingMeasure, setSavingMeasure] = useState(false)
  const [bodyAnalysis, setBodyAnalysis] = useState<ProgressBodyAnalysis | null>(null)
  const [bodyAnalysisLoading, setBodyAnalysisLoading] = useState(false)
  const [bodyAnalysisStep, setBodyAnalysisStep] = useState(0)
  const [bodyUploadPhotos, setBodyUploadPhotos] = useState<{ front?: string; back?: string; side?: string }>({})
  const [showBodyUpload, setShowBodyUpload] = useState(false)
  const [bodyUploadTarget, setBodyUploadTarget] = useState<'front' | 'back' | 'side'>('front')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const alignmentRunRef = useRef(0)
  const alignmentModuleRef = useRef<typeof import('../../../../lib/photo-align') | null>(null)
  const exportRunningRef = useRef(false)
  const photoIds = useMemo(() => props.progressPhotos.map(photo => photo.id).join(','), [props.progressPhotos])

  const analysisSteps = [t('tab.analysisStep0'), t('tab.analysisStep1'), t('tab.analysisStep2'), t('tab.analysisStep3')]
  useEffect(() => {
    if (!userId) return
    props.supabase.from('body_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).then(({ data }) => { if (data?.[0]) setBodyAnalysis(data[0] as ProgressBodyAnalysis) })
  }, [props.supabase, userId])
  useEffect(() => { if (!bodyAnalysisLoading) return; const interval = setInterval(() => setBodyAnalysisStep(step => (step + 1) % analysisSteps.length), 2500); return () => clearInterval(interval) }, [bodyAnalysisLoading, analysisSteps.length])
  useEffect(() => {
    if (!props.progressPhotos.length) return
    let cancelled = false
    async function generate() { const urls: Record<string, string> = {}; for (const photo of props.progressPhotos) { if (cancelled) return; const { data } = await props.supabase.storage.from('progress-photos').createSignedUrl(photo.photo_url, 3600); if (data?.signedUrl) urls[photo.id] = data.signedUrl } if (!cancelled) setSignedUrls(previous => JSON.stringify(previous) === JSON.stringify(urls) ? previous : urls) }
    void generate(); return () => { cancelled = true }
  }, [photoIds, props.progressPhotos, props.supabase])
  useEffect(() => {
    if (!userId) return
    const start = new Date(Date.now() - checkinPeriod * 86_400_000).toISOString().split('T')[0]
    props.supabase.from('daily_checkins').select('*').eq('user_id', userId).gte('date', start).order('date', { ascending: true }).then(({ data }) => setCheckinData((data ?? []) as ProgressCheckin[]))
  }, [checkinPeriod, props.supabase, userId])
  useEffect(() => () => {
    alignmentRunRef.current += 1
    alignmentModuleRef.current?.disposePhotoAlignment()
    alignmentModuleRef.current = null
  }, [])

  const mergedWeights = useMemo(() => { const seen = new Set<string>(); return [...props.weightHistory30, ...localWeights].filter(weight => { const key = `${weight.date}${weight.poids}`; if (seen.has(key)) return false; seen.add(key); return true }).sort((a, b) => a.date.localeCompare(b.date)) }, [localWeights, props.weightHistory30])
  const displayWeights = mergedWeights.length ? mergedWeights : props.weightHistory30
  const periodWeights = useMemo(() => { if (weightPeriod === 'all') return props.weightHistoryFull.length ? props.weightHistoryFull : displayWeights; const days = weightPeriod === '7' ? 7 : weightPeriod === '90' ? 90 : 30; const cutoff = new Date(viewNow.getTime() - days * 86_400_000).toISOString().split('T')[0]; return displayWeights.filter(weight => weight.date >= cutoff) }, [displayWeights, props.weightHistoryFull, viewNow, weightPeriod])
  const chartMinimum = mergedWeights.length ? Math.min(...mergedWeights.map(value => value.poids)) - 1 : props.chartMin
  const chartMaximum = mergedWeights.length ? Math.max(...mergedWeights.map(value => value.poids)) + 1 : props.chartMax
  const minimum = periodWeights.length ? Math.min(...periodWeights.map(value => value.poids)) - 1 : chartMinimum
  const maximum = periodWeights.length ? Math.max(...periodWeights.map(value => value.poids)) + 1 : chartMaximum
  const summary = useMemo(() => buildProgressionSummaryReadModel({ detailedSessionCount: props.wSessions.length, personalRecordCount: props.personalRecords.length, streak: props.streak, weeklyVolume: props.weeklyVolume, weights: displayWeights.map(value => ({ date: value.date, weight: value.poids })) }), [displayWeights, props.personalRecords.length, props.streak, props.wSessions.length, props.weeklyVolume])
  const groupedRecords = useMemo(() => groupRecords(props.personalRecords), [props.personalRecords])

  function openCompare() { setCompareIdx([props.progressPhotos.length - 1, 0]); setSliderValue(50); setShowCompare(true) }
  function closeCompare() { alignmentRunRef.current += 1; alignmentModuleRef.current?.disposePhotoAlignment(); alignmentModuleRef.current = null; setShowCompare(false); setAlignment(null); setAlignError(null); setIsAligning(false) }
  async function alignPhotos() { const before = props.progressPhotos[compareIdx[0]], after = props.progressPhotos[compareIdx[1]]; if (!before || !after || isAligning) return; const run = ++alignmentRunRef.current; setIsAligning(true); setAlignError(null); try { const alignmentRuntime = await import('../../../../lib/photo-align'); if (run !== alignmentRunRef.current) return; alignmentModuleRef.current = alignmentRuntime; const result = await alignmentRuntime.computeAlignment(signedUrls[before.id] ?? '', signedUrls[after.id] ?? ''); if (run !== alignmentRunRef.current) return; if (!result) { setAlignError(t('tab.analysisError')); return } setAlignment(result); await props.supabase.from('progress_photos').update({ adjustments: result.after }).eq('id', after.id); if (run === alignmentRunRef.current) toast.success(t('tab.photosAligned')) } catch { if (run === alignmentRunRef.current) setAlignError(t('tab.analysisError')) } finally { if (run === alignmentRunRef.current) setIsAligning(false) } }
  async function uploadBodyPhoto(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file || !userId) return; const path = `${userId}/body-${bodyUploadTarget}-${Date.now()}.jpg`; const { error } = await props.supabase.storage.from('progress-photos').upload(path, file); if (error) { toast.error(t('tab.uploadError')); return } const { data } = await props.supabase.storage.from('progress-photos').createSignedUrl(path, 3600); if (data?.signedUrl) { setBodyUploadPhotos(previous => ({ ...previous, [bodyUploadTarget]: data.signedUrl })); setBodyUploadTarget(bodyUploadTarget === 'front' ? 'back' : 'side') } event.target.value = '' }
  async function runBodyAnalysis() { const { front, back, side } = bodyUploadPhotos; if (!front || !back || !side || !userId) return; if (bodyAnalysis?.created_at) { const remaining = 3_600_000 - (Date.now() - new Date(bodyAnalysis.created_at).getTime()); if (remaining > 0) { toast.error(t('tab.analysisLimitMin', { mins: Math.ceil(remaining / 60_000) })); return } } setBodyAnalysisLoading(true); setBodyAnalysisStep(0); try { let data: BodyAnalysisResponse | null = null; for (let attempt = 0; attempt < 3; attempt += 1) { const response = await fetch('/api/analyze-body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoFrontUrl: front, photoBackUrl: back, photoSideUrl: side, weight: props.currentWeight || props.profile?.current_weight, height: props.profile?.height }) }); data = await response.json() as BodyAnalysisResponse; if (response.status === 429 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt)); continue } break } if (!data || data.error) throw new Error(data?.error ?? t('tab.analysisError')); const row = { user_id: userId, body_fat_estimate: data.body_fat_estimate, lean_mass_estimate: data.lean_mass_estimate, strengths: data.strengths, improvements: data.improvements, symmetry_score: data.symmetry_score, summary: data.summary, photos_used: 3 }; await props.supabase.from('body_analyses').insert(row); setBodyAnalysis({ ...row, created_at: new Date().toISOString() }); setShowBodyUpload(false); setBodyUploadPhotos({}); toast.success(t('tab.analysisDone')) } catch (error) { const message = error instanceof Error ? error.message : ''; toast.error(message.includes('requêtes') || message.includes('429') ? 'L\'analyse est temporairement indisponible. Réessaye dans quelques minutes.' : (message || t('tab.analysisError'))) } finally { setBodyAnalysisLoading(false) } }
  async function saveWeight() { if (!weightVal || !userId) return; setSavingWeight(true); const poids = Number.parseFloat(weightVal); const { error } = await props.supabase.from('weight_logs').upsert({ user_id: userId, date: weightDate, poids }, { onConflict: 'user_id,date' }); if (error) toast.error(t('tab.saveError')); else { setLocalWeights(previous => [...previous, { date: weightDate, poids }]); toast.success(t('tab.weightSaved')); setShowWeight(false); setWeightVal(''); setWeightDate(new Date().toISOString().split('T')[0]); props.onRefresh() } setSavingWeight(false) }
  async function saveMeasure() { if (savingMeasure || !userId) return; const payload: Record<string, string | number> = { user_id: userId, date: measureDate }; for (const key of ['waist', 'hips', 'chest'] as const) if (measureForm[key]) payload[key] = Number(measureForm[key]); if (measureForm.arms) { payload.left_arm = Number(measureForm.arms); payload.right_arm = Number(measureForm.arms) } if (measureForm.thighs) { payload.left_thigh = Number(measureForm.thighs); payload.right_thigh = Number(measureForm.thighs) } if (Object.keys(payload).length <= 2) return; setSavingMeasure(true); const { error } = await props.supabase.from('body_measurements').insert(payload); if (error) toast.error(t('tab.saveError')); else { toast.success(t('tab.measureSaved')); setShowMeasure(false); setMeasureForm(EMPTY_MEASURES); setMeasureDate(new Date().toISOString().split('T')[0]); props.onRefresh() } setSavingMeasure(false) }
  async function exportData() { if (exportRunningRef.current) return; exportRunningRef.current = true; try { const XLSX = await import('xlsx'); const workbook = XLSX.utils.book_new(); if (displayWeights.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Date', 'Poids (kg)', 'Variation (kg)'], ...displayWeights.map((weight, index) => [weight.date, weight.poids, index ? +(weight.poids - displayWeights[index - 1].poids).toFixed(1) : ''])]), 'Poids'); if (props.measurements.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(measureRows(props.measurements, displayWeights, props.currentWeight, props.profile?.height)), 'Mensurations'); XLSX.writeFile(workbook, 'MoovX_Mes_Donnees.xlsx'); toast.success(t('tab.exportDone')) } catch { toast.error(t('tab.exportError')) } finally { exportRunningRef.current = false } }

  return { activePill, setActivePill, weightPeriod, setWeightPeriod, recordsLimit, setRecordsLimit, showAssessment, setShowAssessment, showCompare, compareIdx, setCompareIdx: (value: [number, number]) => { setCompareIdx(value); setAlignment(null) }, sliderValue, setSliderValue, alignment, setAlignment, isAligning, alignError, closeCompare, openCompare, alignPhotos, checkinData, checkinPeriod, setCheckinPeriod, viewNow, showWeight, setShowWeight, weightVal, setWeightVal, weightDate, setWeightDate, savingWeight, showMeasure, setShowMeasure, measureForm, setMeasureForm, measureDate, setMeasureDate, savingMeasure, bodyAnalysis, bodyAnalysisLoading, analysisStepLabel: analysisSteps[bodyAnalysisStep], bodyUploadPhotos, showBodyUpload, openBodyUpload: () => setShowBodyUpload(true), closeBodyUpload: () => { if (!bodyAnalysisLoading) { setShowBodyUpload(false); setBodyUploadPhotos({}) } }, setBodyUploadTarget, uploadBodyPhoto, runBodyAnalysis, signedUrls, displayWeights, periodWeights, pMin: minimum, pMax: maximum, summary, groupedRecords, saveWeight, saveMeasure, exportData }
}

function groupRecords(records: ProgressTabPublicProps['personalRecords']) { const priority = ['developpe couche', 'bench press', 'squat', 'deadlift', 'souleve de terre', 'overhead press', 'developpe militaire', 'rowing', 'barbell row']; const grouped: Record<string, { name: string; maxWeight: number | null; oneRm: number | null; date: string; unit: string }> = {}; for (const record of records) { const key = record.exercise_name; grouped[key] ??= { name: key, maxWeight: null, oneRm: null, date: record.achieved_at ?? '', unit: record.unit || 'kg' }; if (record.record_type === 'max_weight') grouped[key].maxWeight = record.value; if (record.record_type === '1rm') grouped[key].oneRm = record.value; if ((record.achieved_at ?? '') > grouped[key].date) grouped[key].date = record.achieved_at ?? '' } return Object.values(grouped).sort((a, b) => { const ai = priority.findIndex(value => a.name.toLowerCase().includes(value)), bi = priority.findIndex(value => b.name.toLowerCase().includes(value)); if (ai !== -1 || bi !== -1) return ai === -1 ? 1 : bi === -1 ? -1 : ai - bi; return (b.maxWeight ?? b.oneRm ?? 0) - (a.maxWeight ?? a.oneRm ?? 0) }) }
function measureRows(measures: readonly ProgressMeasurement[], weights: readonly ProgressWeight[], currentWeight?: number, height?: number | null) { return [['Date', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Bras (cm)', 'Cuisses (cm)', '% Graisse', 'IMC'], ...measures.map(measure => { const metres = height ? height / 100 : 0; const bmi = measure.waist && metres > 0 ? +(weights.find(weight => weight.date === measure.date)?.poids || currentWeight || 0) / (metres * metres) : ''; return [measure.date, measure.waist ?? '', measure.hips ?? '', measure.chest ?? '', measure.left_arm ?? '', measure.left_thigh ?? '', measure.body_fat ?? '', typeof bmi === 'number' ? +bmi.toFixed(1) : ''] })] }
