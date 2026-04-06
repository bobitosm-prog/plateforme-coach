'use client'
import { BG_CARD, BORDER, GOLD, TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../../lib/design-tokens'

export const EXERCISE_MUSCLES: Record<string, string[]> = {
  'bench press': ['chest', 'front_delts', 'triceps'], 'developpe couche': ['chest', 'front_delts', 'triceps'],
  'incline press': ['upper_chest', 'front_delts', 'triceps'], 'developpe incline': ['upper_chest', 'front_delts', 'triceps'],
  'overhead press': ['front_delts', 'side_delts', 'triceps'], 'developpe militaire': ['front_delts', 'side_delts', 'triceps'],
  'dips': ['chest', 'triceps', 'front_delts'], 'lateral raise': ['side_delts'], 'elevations laterales': ['side_delts'],
  'pull up': ['lats', 'biceps'], 'tractions': ['lats', 'biceps'], 'tirage vertical': ['lats', 'biceps'],
  'barbell row': ['lats', 'traps', 'biceps'], 'rowing barre': ['lats', 'traps', 'biceps'], 'rowing haltere': ['lats', 'traps', 'biceps'],
  'deadlift': ['lower_back', 'glutes', 'hamstrings', 'traps'], 'souleve de terre': ['lower_back', 'glutes', 'hamstrings'],
  'squat': ['quads', 'glutes', 'lower_back'], 'leg press': ['quads', 'glutes'], 'leg extension': ['quads'],
  'leg curl': ['hamstrings'], 'hip thrust': ['glutes', 'hamstrings'], 'fente': ['quads', 'glutes', 'hamstrings'],
  'bicep curl': ['biceps'], 'curl barre': ['biceps'], 'tricep pushdown': ['triceps'], 'triceps poulie': ['triceps'],
  'crunch': ['abs'], 'planche': ['abs', 'lower_back'], 'mollets': ['calves'],
}

const COLORS: Record<number, string> = { 0: '#4ade80', 1: '#D4A843', 2: '#EF4444' }

export function calculateMuscleStatus(recentSets: { exercise_name: string; created_at: string }[]): Record<string, number> {
  const now = Date.now()
  const status: Record<string, number> = {}
  const allMuscles = ['chest', 'upper_chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'lats', 'traps', 'lower_back', 'abs', 'quads', 'hamstrings', 'glutes', 'calves']
  allMuscles.forEach(m => { status[m] = 0 })
  for (const set of recentSets) {
    const name = (set.exercise_name || '').toLowerCase()
    const muscles = Object.entries(EXERCISE_MUSCLES).find(([k]) => name.includes(k))?.[1] || []
    const hoursAgo = (now - new Date(set.created_at).getTime()) / 3600000
    for (const m of muscles) {
      if (hoursAgo < 24) status[m] = Math.max(status[m], 2)
      else if (hoursAgo < 48) status[m] = Math.max(status[m], 1)
    }
  }
  return status
}

const POS: Record<string, { x: number; y: number; w: number; h: number; side: 'front' | 'back' }> = {
  chest: { x: 35, y: 22, w: 30, h: 8, side: 'front' }, upper_chest: { x: 37, y: 19, w: 26, h: 5, side: 'front' },
  front_delts: { x: 25, y: 18, w: 8, h: 6, side: 'front' }, side_delts: { x: 22, y: 18, w: 6, h: 6, side: 'front' },
  biceps: { x: 22, y: 28, w: 7, h: 10, side: 'front' }, abs: { x: 40, y: 32, w: 20, h: 14, side: 'front' },
  quads: { x: 35, y: 52, w: 12, h: 18, side: 'front' }, calves: { x: 37, y: 74, w: 8, h: 14, side: 'front' },
  triceps: { x: 22, y: 28, w: 7, h: 10, side: 'back' }, lats: { x: 30, y: 24, w: 14, h: 12, side: 'back' },
  traps: { x: 38, y: 14, w: 24, h: 8, side: 'back' }, rear_delts: { x: 25, y: 18, w: 8, h: 6, side: 'back' },
  lower_back: { x: 38, y: 36, w: 24, h: 8, side: 'back' }, glutes: { x: 36, y: 46, w: 28, h: 10, side: 'back' },
  hamstrings: { x: 35, y: 56, w: 12, h: 16, side: 'back' },
}

export default function MuscleHeatMap({ muscleStatus }: { muscleStatus: Record<string, number> }) {
  const renderBody = (side: 'front' | 'back') => (
    <div style={{ position: 'relative', width: 120, height: 240 }}>
      <div style={{ width: '100%', height: '100%', background: 'rgba(212,168,67,0.04)', borderRadius: 60, border: '1px solid rgba(212,168,67,0.1)' }} />
      {Object.entries(POS).filter(([_, p]) => p.side === side).map(([muscle, pos]) => (
        <div key={muscle} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`, background: COLORS[muscleStatus[muscle] || 0], opacity: 0.5, borderRadius: 8, transition: 'all 0.5s ease' }} />
      ))}
      <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: TEXT_MUTED, textTransform: 'uppercase' }}>{side === 'front' ? 'FACE' : 'DOS'}</div>
    </div>
  )
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 3, color: TEXT_PRIMARY }}>RECUPERATION MUSCULAIRE</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>{renderBody('front')}{renderBody('back')}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {[{ c: '#4ade80', l: 'Frais' }, { c: '#D4A843', l: 'Recupere' }, { c: '#EF4444', l: 'Fatigue' }].map(i => (
          <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c, opacity: 0.6 }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{i.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
