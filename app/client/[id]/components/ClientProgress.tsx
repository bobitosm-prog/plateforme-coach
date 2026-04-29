'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts'
import { Scale, Ruler, Camera, Dumbbell } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_ALT, FONT_BODY, RADIUS_CARD } from '@/lib/design-tokens'
import { useIsMobile } from '@/app/hooks/useIsMobile'

type Props = {
  weightLogs: { date: string; poids: number }[]
  bodyMeasurements: any[]
  progressPhotos: any[]
  completedSessions: { id: string; name: string | null; created_at: string; duration_minutes: number | null; muscles_worked?: string[] | null }[]
  startWeight?: number | null
  targetWeight?: number | null
  currentWeight?: number | null
}

const sectionStyle = { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }
const headingStyle = { color: GOLD, fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: '0 0 16px', textTransform: 'uppercase' as const }

/* ── Timeline: chronological feed ── */
const TIMELINE_TYPES = {
  weight:      { label: 'Poids',   Icon: Scale,    color: GOLD },
  measurement: { label: 'Mesures', Icon: Ruler,    color: GOLD },
  photo:       { label: 'Photos',  Icon: Camera,   color: GOLD },
  session:     { label: 'Séances', Icon: Dumbbell, color: GOLD },
} as const
type TimelineType = keyof typeof TIMELINE_TYPES

interface TimelineEntry {
  date: string
  type: TimelineType
  data: any
}

function buildTimeline(
  weights: { date: string; poids: number }[],
  measurements: any[],
  photos: any[],
  sessions: { id: string; created_at: string; name: string | null; duration_minutes: number | null }[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  weights.forEach(w => entries.push({ date: w.date, type: 'weight', data: w }))
  measurements.forEach(m => entries.push({ date: m.date || m.created_at, type: 'measurement', data: m }))
  photos.forEach(p => entries.push({ date: p.created_at, type: 'photo', data: p }))
  sessions.forEach(s => entries.push({ date: s.created_at, type: 'session', data: s }))
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

function TimelineSection({ weights, measurements, photos, sessions, isMobile }: {
  weights: { date: string; poids: number }[]
  measurements: any[]
  photos: any[]
  sessions: { id: string; created_at: string; name: string | null; duration_minutes: number | null }[]
  isMobile: boolean
}) {
  const [filters, setFilters] = useState<Set<TimelineType>>(new Set(['weight', 'measurement', 'photo', 'session']))
  const allEntries = buildTimeline(weights, measurements, photos, sessions)
  const filtered = allEntries.filter(e => filters.has(e.type))

  const toggleFilter = (t: TimelineType) => {
    setFilters(prev => {
      const next = new Set(prev)
      if (next.has(t)) { if (next.size > 1) next.delete(t) } else next.add(t)
      return next
    })
  }

  const renderEntry = (e: TimelineEntry, i: number) => {
    const meta = TIMELINE_TYPES[e.type]
    const IconComp = meta.Icon
    return (
      <div key={`${e.type}-${i}`} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: GOLD_DIM, borderRadius: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,168,67,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconComp size={15} color={GOLD} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: FONT_ALT, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            {meta.label} · {formatRelativeTime(e.date)}
          </div>
          {e.type === 'weight' && (
            <div style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 600, fontFamily: FONT_BODY }}>{e.data.poids} kg</div>
          )}
          {e.type === 'measurement' && (
            <div style={{ fontSize: 12, color: TEXT_PRIMARY, fontFamily: FONT_BODY, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {e.data.chest != null && <span>Poit: <b>{e.data.chest}</b></span>}
              {e.data.waist != null && <span>Taille: <b>{e.data.waist}</b></span>}
              {e.data.hips != null && <span>Hanches: <b>{e.data.hips}</b></span>}
              {e.data.biceps != null && <span>Bras: <b>{e.data.biceps}</b></span>}
              {e.data.thighs != null && <span>Cuisses: <b>{e.data.thighs}</b></span>}
            </div>
          )}
          {e.type === 'photo' && e.data.signedUrl && (
            <img src={e.data.signedUrl} alt="" loading="lazy" style={{ width: isMobile ? 60 : 80, aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, marginTop: 4 }} />
          )}
          {e.type === 'session' && (
            <div style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 600, fontFamily: FONT_BODY }}>
              {e.data.name || 'Séance'}
              {e.data.duration_minutes != null && <span style={{ fontWeight: 400, color: TEXT_MUTED, marginLeft: 6, fontSize: 11 }}>{e.data.duration_minutes} min</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <section style={sectionStyle}>
      <h3 style={headingStyle}>TIMELINE</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {(Object.keys(TIMELINE_TYPES) as TimelineType[]).map(t => {
          const active = filters.has(t)
          return (
            <button key={t} type="button" onClick={() => toggleFilter(t)} style={{
              padding: '4px 10px', borderRadius: 12,
              border: `1px solid ${active ? GOLD : BORDER}`,
              background: active ? GOLD : 'transparent',
              color: active ? '#0D0B08' : TEXT_MUTED,
              fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 150ms',
            }}>
              {TIMELINE_TYPES[t].label}
            </button>
          )
        })}
      </div>
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.slice(0, 30).map(renderEntry)}
        </div>
      ) : (
        <p style={{ color: TEXT_DIM, fontStyle: 'italic', fontFamily: FONT_BODY, fontSize: 13, margin: 0 }}>Aucun evenement enregistre.</p>
      )}
    </section>
  )
}

/* ── Heatmap: training frequency ── */
function HeatmapSection({ sessions, isMobile }: { sessions: { created_at: string }[]; isMobile: boolean }) {
  const weeksToShow = isMobile ? 8 : 12
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Count sessions per day string
  const countByDay: Record<string, number> = {}
  for (const s of sessions) {
    const d = s.created_at.split('T')[0]
    countByDay[d] = (countByDay[d] || 0) + 1
  }

  // Build grid: rows = weeks (oldest first), cols = Mon-Sun
  const dow = today.getDay() || 7 // Mon=1..Sun=7
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (weeksToShow * 7) - (dow - 1))

  const weeks: { date: Date; count: number }[][] = []
  const cursor = new Date(startDate)
  for (let w = 0; w < weeksToShow; w++) {
    const week: { date: Date; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().split('T')[0]
      week.push({ date: new Date(cursor), count: countByDay[key] || 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  const cellSize = isMobile ? 14 : 16
  const gap = 2

  return (
    <section style={sectionStyle}>
      <h3 style={headingStyle}>FREQUENCE D&apos;ENTRAINEMENT</h3>
      <div style={{ display: 'flex', gap: 2, fontSize: 9, color: TEXT_DIM, fontFamily: FONT_ALT, marginBottom: 4 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} style={{ width: cellSize, textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap }}>
            {week.map((day, di) => {
              const isFuture = day.date > today
              const opacity = isFuture ? 0 : day.count === 0 ? 0.08 : day.count === 1 ? 0.3 : day.count === 2 ? 0.6 : 1
              return (
                <div
                  key={di}
                  title={`${day.date.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' })} — ${day.count} séance(s)`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 3,
                    background: isFuture ? 'transparent' : GOLD,
                    opacity,
                    border: isFuture ? 'none' : `1px solid rgba(212,168,67,${opacity > 0.1 ? 0.3 : 0.1})`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 9, color: TEXT_DIM, fontFamily: FONT_BODY, alignItems: 'center' }}>
        <span>Moins</span>
        {[0.08, 0.3, 0.6, 1].map((o, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: GOLD, opacity: o }} />
        ))}
        <span>Plus</span>
      </div>
    </section>
  )
}

/* ── Top muscles chart ── */
function TopMusclesSection({ sessions, isMobile }: { sessions: { muscles_worked?: string[] | null }[]; isMobile: boolean }) {
  const counts: Record<string, number> = {}
  for (const s of sessions) {
    for (const m of (s.muscles_worked || [])) {
      counts[m] = (counts[m] || 0) + 1
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (sorted.length === 0) return null

  const data = sorted.map(([name, count]) => ({ name, count }))

  return (
    <section style={sectionStyle}>
      <h3 style={headingStyle}>TOP MUSCLES TRAVAILLES</h3>
      <div style={{ height: isMobile ? 140 : 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: isMobile ? 60 : 80, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" stroke={TEXT_DIM} fontSize={10} allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke={TEXT_DIM} fontSize={isMobile ? 9 : 11} width={isMobile ? 55 : 75} />
            <Tooltip
              contentStyle={{ background: '#0D0B08', border: `1px solid ${GOLD}`, borderRadius: 8 }}
              labelStyle={{ color: GOLD }}
              itemStyle={{ color: TEXT_PRIMARY }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={GOLD} fillOpacity={1 - i * 0.15} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

/* ── Main component ── */
export default function ClientProgress({
  weightLogs, bodyMeasurements, progressPhotos, completedSessions,
  startWeight, targetWeight, currentWeight,
}: Props) {
  const isMobile = useIsMobile()

  const chartData = weightLogs.map(w => ({
    date: w.date,
    label: new Date(w.date).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' }),
    poids: w.poids,
  }))

  const weightDelta = (currentWeight && startWeight)
    ? +(currentWeight - startWeight).toFixed(1)
    : null

  const startOfWeek = new Date()
  const dow = startOfWeek.getDay() || 7
  startOfWeek.setDate(startOfWeek.getDate() - (dow - 1))
  startOfWeek.setHours(0, 0, 0, 0)
  const sessionsThisWeek = completedSessions.filter(cs => new Date(cs.created_at) >= startOfWeek).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Section 0 — Training heatmap */}
      <HeatmapSection sessions={completedSessions} isMobile={isMobile} />

      {/* Section 0b — Top muscles */}
      <TopMusclesSection sessions={completedSessions} isMobile={isMobile} />

      {/* Section 1 — Weight evolution */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>EVOLUTION DU POIDS</h3>
        {chartData.length > 0 ? (
          <>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke={TEXT_DIM} fontSize={10} />
                  <YAxis stroke={TEXT_DIM} fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: '#0D0B08', border: `1px solid ${GOLD}`, borderRadius: 8 }}
                    labelStyle={{ color: GOLD }}
                    itemStyle={{ color: TEXT_PRIMARY }}
                  />
                  <Line type="monotone" dataKey="poids" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 3 }} />
                  {targetWeight != null && (
                    <ReferenceLine y={targetWeight} stroke={GOLD} strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: 'Objectif', fill: TEXT_DIM, fontSize: 10, position: 'right' }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: TEXT_MUTED, fontFamily: FONT_BODY, flexWrap: 'wrap' }}>
              {startWeight != null && <span>Initial : <b style={{ color: TEXT_PRIMARY }}>{startWeight} kg</b></span>}
              {currentWeight != null && <span>Actuel : <b style={{ color: TEXT_PRIMARY }}>{currentWeight} kg</b></span>}
              {targetWeight != null && <span>Objectif : <b style={{ color: TEXT_PRIMARY }}>{targetWeight} kg</b></span>}
              {weightDelta !== null && (
                <span style={{ color: weightDelta < 0 ? '#7ee787' : weightDelta > 0 ? '#ff7b72' : TEXT_MUTED }}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                </span>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: TEXT_DIM, fontStyle: 'italic', fontFamily: FONT_BODY, fontSize: 13, margin: 0 }}>Aucune donnee de poids enregistree.</p>
        )}
      </section>

      {/* Section — Timeline */}
      <TimelineSection
        weights={weightLogs}
        measurements={bodyMeasurements}
        photos={progressPhotos}
        sessions={completedSessions}
        isMobile={isMobile}
      />

      {/* Section 2 — Body measurements */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>MESURES CORPORELLES</h3>
        {bodyMeasurements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bodyMeasurements.slice(0, 5).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: GOLD_DIM, borderRadius: 8, fontSize: 12, fontFamily: FONT_BODY }}>
                <span style={{ color: TEXT_MUTED }}>
                  {new Date(m.date).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span style={{ color: TEXT_PRIMARY, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {m.chest != null && <span>Poit: <b>{m.chest}</b></span>}
                  {m.waist != null && <span>Taille: <b>{m.waist}</b></span>}
                  {m.hips != null && <span>Hanches: <b>{m.hips}</b></span>}
                  {m.biceps != null && <span>Bras: <b>{m.biceps}</b></span>}
                  {m.thighs != null && <span>Cuisses: <b>{m.thighs}</b></span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: TEXT_DIM, fontStyle: 'italic', fontFamily: FONT_BODY, fontSize: 13, margin: 0 }}>Aucune mesure enregistree.</p>
        )}
      </section>

      {/* Section 3 — Progress photos */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>PHOTOS DE PROGRESSION</h3>
        {progressPhotos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {progressPhotos.slice(0, 12).map((p: any) => {
              const url = p.signedUrl
              if (!url) return null
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  <img src={url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />
                  <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 9, color: TEXT_PRIMARY, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4, textAlign: 'center' }}>
                    {new Date(p.created_at).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: TEXT_DIM, fontStyle: 'italic', fontFamily: FONT_BODY, fontSize: 13, margin: 0 }}>Aucune photo enregistree.</p>
        )}
      </section>

      {/* Section 4 — Completed sessions history */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...headingStyle, margin: 0 }}>HISTORIQUE DES SEANCES</h3>
          <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: FONT_BODY }}>{sessionsThisWeek} cette semaine</span>
        </div>
        {completedSessions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedSessions.slice(0, 20).map(cs => (
              <div key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: GOLD_DIM, borderRadius: 8, fontSize: 12, fontFamily: FONT_BODY }}>
                <div>
                  <div style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>{cs.name || 'Seance'}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{formatRelativeTime(cs.created_at)}</div>
                </div>
                {cs.duration_minutes != null && (
                  <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{cs.duration_minutes} min</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: TEXT_DIM, fontStyle: 'italic', fontFamily: FONT_BODY, fontSize: 13, margin: 0 }}>Aucune seance completee.</p>
        )}
      </section>

    </div>
  )
}
