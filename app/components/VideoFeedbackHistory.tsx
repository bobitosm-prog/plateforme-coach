'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Video, Check, Clock, MessageCircle } from 'lucide-react'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)
const GOLD = '#C9A84C'

export default function VideoFeedbackHistory({ userId }: { userId: string }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase.from('exercise_feedback')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setFeedbacks(data || []); setLoading(false) })
  }, [userId])

  if (loading) return null
  if (feedbacks.length === 0) return null

  const statusInfo: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'En attente', color: '#f59e0b', icon: <Clock size={12} /> },
    reviewed: { label: 'Feedback reçu', color: '#3b82f6', icon: <MessageCircle size={12} /> },
    approved: { label: 'Approuvé', color: '#4ade80', icon: <Check size={12} /> },
  }

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Video size={16} color={GOLD} />
        <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '0.04em' }}>
          MES VIDÉOS ({feedbacks.length})
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {feedbacks.map(fb => {
          const info = statusInfo[fb.status] || statusInfo.pending
          const isExpanded = expanded === fb.id

          return (
            <div key={fb.id}
              onClick={() => setExpanded(isExpanded ? null : fb.id)}
              style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{fb.exercise_name}</span>
                  <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{new Date(fb.created_at).toLocaleDateString('fr-CH')}</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: info.color, background: `${info.color}15`, border: `1px solid ${info.color}30`, borderRadius: 12, padding: '3px 10px' }}>
                  {info.icon} {info.label}
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12 }}>
                  <video src={fb.video_url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 200, marginBottom: 8 }} />
                  {fb.client_note && (
                    <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic', margin: '0 0 8px' }}>Toi : "{fb.client_note}"</p>
                  )}
                  {fb.coach_feedback && (
                    <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: 10, marginTop: 4 }}>
                      <p style={{ fontSize: 11, color: GOLD, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback coach</p>
                      <p style={{ fontSize: 13, color: '#d1d5db', margin: 0, lineHeight: 1.5 }}>{fb.coach_feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
