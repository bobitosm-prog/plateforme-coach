'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { BG_CARD, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_ALT, FONT_BODY, RADIUS_CARD } from '@/lib/design-tokens'

type Props = {
  weightLogs: { date: string; poids: number }[]
  bodyMeasurements: any[]
  progressPhotos: any[]
  completedSessions: { id: string; name: string | null; created_at: string; duration_minutes: number | null }[]
  startWeight?: number | null
  targetWeight?: number | null
  currentWeight?: number | null
}

const sectionStyle = { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }
const headingStyle = { color: GOLD, fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: '0 0 16px', textTransform: 'uppercase' as const }

export default function ClientProgress({
  weightLogs, bodyMeasurements, progressPhotos, completedSessions,
  startWeight, targetWeight, currentWeight,
}: Props) {
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
