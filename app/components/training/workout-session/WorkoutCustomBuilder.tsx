'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Dumbbell, Search, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import { getExerciseName } from '../../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../../lib/i18n-muscle'
import { getRestSeconds } from '../../../../lib/utils/exercise'
import { BG_BASE, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const WORKOUT_MUSCLE_FILTERS = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdos', 'Corps Entier']

interface CustomExercise {
  id: string
  name: string
  muscle_group?: string | null
  equipment?: string | null
  difficulty?: string | null
  description?: string | null
  video_url?: string | null
  rest_seconds?: number | string | null
}

interface ConfiguredExercise extends CustomExercise { targetSets: number; targetReps: string; rest: number }
export interface CustomWorkoutLaunchExercise { exercise_name: string; muscle_group?: string | null; sets: number; reps: string; rest_seconds: number; notes?: string | null; video_url?: string | null }
type ConfigKey = 'targetSets' | 'targetReps' | 'rest'

function uniqueByName(rows: CustomExercise[]): CustomExercise[] {
  return rows.filter((exercise, index, all) => all.findIndex(candidate => candidate.name.toLowerCase() === exercise.name.toLowerCase()) === index)
}

export function WorkoutCustomBuilder({ onStart, onCancel }: { onStart: (name: string, exos: CustomWorkoutLaunchExercise[]) => void; onCancel: () => void }) {
  const t = useTranslations('training_tab.ws')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  const ALL_KEY = '__all__'
  const muscleFilters = [{ key: ALL_KEY, label: tMuscle('all') }, ...WORKOUT_MUSCLE_FILTERS.slice(1).map(m => ({ key: m, label: getMuscleLabel(m, locale, tMuscle) }))]
  const name = t('builder.defaultName')
  const [search, setSearch] = useState('')
  const [dbExos, setDbExos] = useState<CustomExercise[]>([])
  const [selected, setSelected] = useState<CustomExercise[]>([])
  const [filter, setFilter] = useState(ALL_KEY)
  const [step, setStep] = useState<'build' | 'config'>('build')
  const [cfg, setCfg] = useState<ConfiguredExercise[]>([])
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (ref.current !== null) clearTimeout(ref.current)
    ref.current = setTimeout(async () => {
      let q = supabase.from('exercises_db').select('id, name, muscle_group, equipment, difficulty, description')
      if (search.length >= 2) q = q.ilike('name', `%${search}%`)
      if (filter && filter !== ALL_KEY) q = q.eq('muscle_group', filter)
      const { data } = await q.limit(60).order('name')
      // Deduplicate by name
      setDbExos(uniqueByName((data || []) as CustomExercise[]))
    }, 250)
  }, [search, filter])

  useEffect(() => {
    supabase.from('exercises_db').select('id, name, muscle_group, equipment, difficulty, description').order('name').limit(60)
      .then(({ data }) => {
        setDbExos(uniqueByName((data || []) as CustomExercise[]))
      })
  }, [])

  const toggle = (e: CustomExercise) => setSelected(p => p.find(x => x.id === e.id) ? p.filter(x => x.id !== e.id) : [...p, e])
  const goConfig = () => { setCfg(selected.map(e => ({ ...e, targetSets: 3, targetReps: '10-12', rest: getRestSeconds(e) }))); setStep('config') }
  const launch = () => onStart(name, cfg.map(e => ({ exercise_name: e.name, muscle_group: e.muscle_group, sets: e.targetSets, reps: e.targetReps, rest_seconds: e.rest, notes: e.description, video_url: e.video_url })))
  const dc = (d: string) => d === 'debutant' ? GREEN : d === 'intermediaire' ? GOLD : RED

  if (step === 'config') return (
    <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', paddingRight: 16, paddingBottom: 16, paddingLeft: 16, borderBottom: `1px solid ${BORDER}`, background: BG_BASE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep('build')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> {t('back')}
        </button>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>{t('builder.configure')}</span>
        <button onClick={launch} style={{ background: GOLD, color: colors.onGold, border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>{t('builder.launch')}</button>
      </div>
      <div style={{ flex: 1, paddingTop: 16, paddingRight: 16, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cfg.map((e, i) => (
          <div key={e.id} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 14 }}>{i + 1}</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
                {e.muscle_group && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>{getMuscleLabel(e.muscle_group, locale, tMuscle)}</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {([[t('builder.sets'), 'targetSets', 'number', ''], [t('builder.reps'), 'targetReps', 'text', ''], [t('builder.rest'), 'rest', 'number', 's']] as [string, ConfigKey, string, string][]).map(([label, key, type, unit]) => (
                <div key={key} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <input type={type} value={e[key]}
                      onChange={ev => setCfg(p => p.map((x, j) => j !== i ? x : { ...x, [key]: type === 'number' ? parseInt(ev.target.value) || 0 : ev.target.value }))}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 18 }} />
                    {unit && <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: FONT_BODY }}>{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingRight: 16, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', paddingLeft: 16, background: 'rgba(13,11,8,0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${GOLD_RULE}`, zIndex: 51 }}>
        <button onClick={launch} style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
          {t('builder.launchSession')}
        </button>
      </div>
    </div>
  )

  return (
    <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, zIndex: 50, background: BG_BASE, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: BG_BASE, paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', paddingRight: 16, paddingBottom: 10, paddingLeft: 16, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> {t('back')}
          </button>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, color: TEXT_PRIMARY }}>{t('builder.add')}</span>
          {selected.length > 0 ? (
            <button onClick={goConfig} style={{ background: GOLD, color: colors.onGold, border: 'none', borderRadius: 12, padding: '8px 16px', fontFamily: FONT_ALT, fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>{t('builder.next', { count: selected.length })}</button>
          ) : <div style={{ width: 60 }} />}
        </div>

        {/* Selected tags */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {selected.map(e => (
              <button key={e.id} onClick={() => toggle(e)} style={{ padding: '4px 10px', borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {getExerciseName(e, locale)} <X size={9} />
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
          <input autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} inputMode="search" enterKeyHint="search"
            value={search} onChange={e => setSearch(e.target.value)} placeholder={t('builder.searchPlaceholder')}
            style={{ width: '100%', padding: '14px 44px 14px 36px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: 16, fontFamily: FONT_BODY, outline: 'none' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: GOLD_DIM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} color={GOLD} />
            </button>
          )}
        </div>

        {/* Muscle filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {muscleFilters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 14px', borderRadius: 10,
              border: `1px solid ${filter === f.key ? GOLD : BORDER}`,
              background: filter === f.key ? GOLD_DIM : colors.surface2,
              color: filter === f.key ? GOLD : TEXT_MUTED,
              fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 8, paddingRight: 16, paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))', paddingLeft: 16 }}>
        {dbExos.map(e => {
          const sel = !!selected.find(x => x.id === e.id)
          return (
            <button key={e.id} onClick={() => toggle(e)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0', borderBottom: `1px solid ${BORDER}`,
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              opacity: sel ? 0.5 : 1,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: sel ? GOLD : GOLD_DIM, border: `1px solid ${sel ? 'transparent' : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sel ? <Check size={16} color={colors.onGold} strokeWidth={3} /> : <Dumbbell size={15} color={TEXT_DIM} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{getExerciseName(e, locale)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.muscle_group && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: GOLD_DIM, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' as const }}>{getMuscleLabel(e.muscle_group, locale, tMuscle)}</span>}
                  {e.difficulty && <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${dc(e.difficulty)}18`, color: dc(e.difficulty), letterSpacing: 1 }}>{t(`difficulty.${e.difficulty}`)}</span>}
                  {e.equipment && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_DIM }}>{e.equipment}</span>}
                </div>
              </div>
            </button>
          )
        })}
        {dbExos.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontSize: 14 }}>{t('builder.noResults')}</div>}
      </div>

      {/* Bottom button */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingRight: 16, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', paddingLeft: 16, background: 'rgba(13,11,8,0.9)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${BORDER}` }}>
          <button onClick={goConfig} style={{ width: '100%', padding: 16, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold, fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
            {t('builder.addExercises', { count: selected.length })}
          </button>
        </div>
      )}
    </div>
  )
}
