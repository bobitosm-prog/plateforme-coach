'use client'
import { useState } from 'react'
import { Dumbbell, Search, ChevronRight, ArrowRightLeft, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../lib/i18n-muscle'
import {
  collectProgramExerciseNames,
  findExerciseAlternatives,
  resolveFreeSessionExercise,
  resolveLegacyExerciseName,
  searchExerciseLibrary,
} from '../../../lib/training/exercise-library'
import { toast } from 'sonner'
import { fonts, colors, btnPrimary, Z_MODAL } from '../../../lib/design-tokens'
import { RailOverlay } from '../ui/RailOverlay'
import SectionTitle from '../ui/SectionTitle'
import DeferredVideo from '../media/DeferredVideo'
import { resolveExerciseVideoPoster, resolveLocalExerciseVideoPoster } from '../../../lib/media/exercise-video-posters'

// Mix of DB values + UI aliases (Jambes aggregates quads/hamstrings/glutes/calves)
const MUSCLE_FILTER_VALUES = ['Pectoraux', 'Dos', '\u00c9paules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Fessiers', 'Mollets']

const sectionHeader: React.CSSProperties = {
  fontFamily: fonts.alt, fontSize: 11, fontWeight: 700,
  letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase',
}

const cardWrapper: React.CSSProperties = {
  background: colors.surface2, border: `1px solid ${colors.divider}`,
  borderRadius: 16, padding: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: colors.surface2,
  border: `1px solid ${colors.divider}`, borderRadius: 12,
  padding: '12px 16px 12px 36px', color: colors.text,
  fontFamily: fonts.body, fontSize: 14, outline: 'none',
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0, padding: '8px 14px', borderRadius: 10,
    background: active ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${active ? colors.gold : 'rgba(255,255,255,0.1)'}`,
    fontFamily: fonts.alt, fontSize: 9, fontWeight: 700,
    letterSpacing: '0.18em', color: active ? colors.gold : colors.textDim,
    textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  }
}

interface ExerciseLibrarySectionProps {
  exercisesCache: any[]
  activeCustomProgram: any
  supabase: any
  onProgramUpdate: (updated: any) => void
  onStartWorkout: (day: any, exercises: any[]) => void
}

export default function ExerciseLibrarySection({ exercisesCache, activeCustomProgram, supabase, onProgramUpdate, onStartWorkout }: ExerciseLibrarySectionProps) {
  const t = useTranslations('training_tab.library')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const ALL_KEY = '__all__'
  const muscleFilters = [{ key: ALL_KEY, label: tMuscle('all') }, ...MUSCLE_FILTER_VALUES.map(m => ({ key: m, label: getMuscleLabel(m, locale, tMuscle) }))]
  const [libSearch, setLibSearch] = useState('')
  const [libMuscle, setLibMuscle] = useState(ALL_KEY)
  const [libShowAll, setLibShowAll] = useState(false)
  const [libDetail, setLibDetail] = useState<any>(null)
  const [altSearch, setAltSearch] = useState('')
  const [altSelected, setAltSelected] = useState<any>(null)
  const [altResults, setAltResults] = useState<any[]>([])

  const filterExercises = (search: string, muscle: string) =>
    searchExerciseLibrary(exercisesCache, { search, muscle, allMusclesKey: ALL_KEY }).results

  return (
    <>
      {/* ═══ EXERCICES ═══ */}
      <div style={{ padding: '0 20px 16px' }}>
        <SectionTitle noPadding title={t('exercises')} action={{ label: t('viewAll') + ' ›', onClick: () => setLibShowAll(true) }} />
        <div style={cardWrapper}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder={t('searchPlaceholder')} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
            {muscleFilters.map(m => (
              <button key={m.key} onClick={() => setLibMuscle(m.key)} style={chipStyle(libMuscle === m.key)}>{m.label}</button>
            ))}
          </div>
          {(() => {
            const filtered = filterExercises(libSearch, libMuscle)
            const shown = filtered.slice(0, 5)
            return shown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shown.map((ex: any) => (
                  <button key={ex.id} onClick={() => setLibDetail(ex)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.divider}` }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ex.gif_url ? <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dumbbell size={20} color={colors.textDim} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getExerciseName(ex, locale)}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                        {ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.alt, fontWeight: 700, color: colors.gold, background: 'rgba(230,195,100,0.12)', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{getMuscleLabel(ex.muscle_group, locale, tMuscle)}</span>}
                      </div>
                      {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                    </div>
                    <ChevronRight size={16} color={colors.textDim} style={{ flexShrink: 0 }} />
                  </button>
                ))}
                {filtered.length > 5 && (
                  <button onClick={() => setLibShowAll(true)} style={{ padding: '10px 0', background: 'transparent', border: 'none', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', textAlign: 'center', textTransform: 'uppercase' }}>{t('moreExercises', { count: filtered.length - 5 })}</button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 16, fontFamily: fonts.body, fontSize: 14, color: colors.textDim, fontStyle: 'italic' }}>{t('noResults')}</div>
            )
          })()}
        </div>
      </div>

      {/* Detail bottom-sheet */}
      {libDetail && (<RailOverlay>
        <div style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ ...sectionHeader, fontSize: 16 }}>{libDetail.name}</span>
              <button aria-label={t('close')} onClick={() => setLibDetail(null)} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: `1px solid ${colors.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={colors.text} /></button>
            </div>
            {libDetail.video_url && <div style={{ aspectRatio: '9/16', maxHeight: '55vh', margin: '0 auto 16px', borderRadius: 12, overflow: 'hidden', background: colors.surfaceHigh }}><DeferredVideo activation="mount" ariaLabel={`${getExerciseName(libDetail, locale)} — démonstration`} autoPlay loop muted poster={resolveExerciseVideoPoster(libDetail.video_url)} posterFallback={resolveLocalExerciseVideoPoster(libDetail.video_url)} src={libDetail.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>}
            {!libDetail.video_url && libDetail.gif_url && <div style={{ aspectRatio: '9/16', maxHeight: '55vh', margin: '0 auto 16px', borderRadius: 12, overflow: 'hidden', background: colors.surfaceHigh }}><img src={libDetail.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {libDetail.muscle_group && <span style={{ fontSize: 10, fontFamily: fonts.alt, fontWeight: 700, color: colors.gold, background: 'rgba(230,195,100,0.12)', padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{getMuscleLabel(libDetail.muscle_group, locale, tMuscle)}</span>}
              {libDetail.difficulty && <span style={{ fontSize: 10, fontFamily: fonts.alt, fontWeight: 700, color: colors.textMuted, background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{libDetail.difficulty}</span>}
              {libDetail.equipment && <span style={{ fontSize: 10, fontFamily: fonts.alt, fontWeight: 700, color: colors.textMuted, background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{libDetail.equipment}</span>}
            </div>
            {libDetail.description && <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>{libDetail.description}</p>}
            {libDetail.execution_tips && <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textDim, lineHeight: 1.5, marginBottom: 16, margin: '0 0 16px' }}>{libDetail.execution_tips}</p>}
            <button onClick={() => { const selected = resolveFreeSessionExercise(libDetail); if (selected) onStartWorkout({ day_name: 'Séance libre' }, [selected]); setLibDetail(null) }} style={{ ...btnPrimary, width: '100%', padding: '14px 0', fontSize: 13, textAlign: 'center' }}>{t('addToSession')}</button>
          </div>
        </div>
      </RailOverlay>)}

      {/* Fullscreen library */}
      {libShowAll && (<RailOverlay>
        <div style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: colors.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: `1px solid ${colors.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button aria-label={t('close')} onClick={() => setLibShowAll(false)} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: `1px solid ${colors.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color={colors.text} /></button>
            <span style={{ ...sectionHeader, fontSize: 16, flex: 1 }}>{t('libraryTitle')}</span>
          </div>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder={t('searchShort')} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 20px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {muscleFilters.map(m => (
              <button key={m.key} onClick={() => setLibMuscle(m.key)} style={chipStyle(libMuscle === m.key)}>{m.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
            {filterExercises(libSearch, libMuscle).map((ex: any) => (
              <button key={ex.id} onClick={() => { setLibDetail(ex); setLibShowAll(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.divider}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ex.gif_url ? <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dumbbell size={20} color={colors.textDim} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{getExerciseName(ex, locale)}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>{ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.alt, fontWeight: 700, color: colors.gold, background: 'rgba(230,195,100,0.12)', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{getMuscleLabel(ex.muscle_group, locale, tMuscle)}</span>}</div>
                  {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                </div>
                <ChevronRight size={16} color={colors.textDim} />
              </button>
            ))}
          </div>
        </div>
      </RailOverlay>)}

      {/* ═══ ALTERNATIVES ═══ */}
      <div style={{ padding: '0 20px 16px' }}>
        <SectionTitle noPadding title={t('alternatives')} icon={<ArrowRightLeft size={14} />} />
        <div style={cardWrapper}>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, margin: '0 0 12px', lineHeight: 1.5 }}>{t('altDesc')}</p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={altSearch} onChange={e => { setAltSearch(e.target.value); setAltSelected(null); setAltResults([]) }} placeholder={t('altSearchPlaceholder')} style={inputStyle} />
          </div>
          {altSearch.length >= 2 && !altSelected && (
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8, borderRadius: 12, border: `1px solid ${colors.divider}`, background: colors.surface2 }}>
              {searchExerciseLibrary(exercisesCache, { search: altSearch, limit: 8 }).results.map((ex: any) => (
                <button key={ex.id} onClick={async () => { setAltSelected(ex); setAltSearch(ex.name); setAltResults(findExerciseAlternatives(exercisesCache, ex)) }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.divider}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body }}>{getExerciseName(ex, locale)}</div>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: fonts.body }}>{getMuscleLabel(ex.muscle_group, locale, tMuscle)} &middot; {ex.equipment || 'N/A'}</div>
                </button>
              ))}
            </div>
          )}
          {!altSelected && activeCustomProgram?.days && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(() => {
                const exNames = collectProgramExerciseNames(activeCustomProgram.days)
                return exNames.map((n: string) => {
                  const match = exercisesCache.find((e: any) => resolveLegacyExerciseName(e) === n)
                  return (
                    <button key={n} onClick={() => { if (match) { setAltSelected(match); setAltSearch(match.name); setAltResults(findExerciseAlternatives(exercisesCache, match)) } }} style={chipStyle(false)}>{match ? getExerciseName(match, locale) : n}</button>
                  )
                })
              })()}
            </div>
          )}
          {altSelected && altResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {altResults.map((alt: any) => (
                <div key={alt.id} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{getExerciseName(alt, locale)}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 9, fontFamily: fonts.alt, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('sameTarget')}</span>
                      {alt.equipment && <span style={{ fontSize: 9, fontFamily: fonts.alt, color: colors.textDim, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 999, letterSpacing: '0.1em' }}>{alt.equipment}</span>}
                    </div>
                  </div>
                  <button onClick={async () => { if (!activeCustomProgram?.id) return; const updated = activeCustomProgram.days.map((d: any) => ({ ...d, exercises: (d.exercises || []).map((e: any) => { const n = e.exercise_name || e.name; if (n === altSelected.name) return { ...e, exercise_name: alt.name, name: alt.name, muscle_group: alt.muscle_group }; return e }) })); await supabase.from('custom_programs').update({ days: updated }).eq('id', activeCustomProgram.id); onProgramUpdate({ ...activeCustomProgram, days: updated }); setAltSelected(null); setAltSearch(''); setAltResults([]); toast.success(`${getExerciseName(altSelected, locale)} \u2192 ${getExerciseName(alt, locale)}`) }} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 10, flexShrink: 0 }}>{t('replace')}</button>
                </div>
              ))}
            </div>
          )}
          {altSelected && altResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: 12, fontFamily: fonts.body, fontSize: 12, color: colors.textDim, fontStyle: 'italic' }}>{t('noAlt')}</div>
          )}
        </div>
      </div>
    </>
  )
}
