'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Video, Check, Clock, MessageCircle } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

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
    pending: { label: 'En attente', color: GOLD, icon: <Clock size={12} /> },
    reviewed: { label: 'Feedback recu', color: GOLD, icon: <MessageCircle size={12} /> },
    approved: { label: 'Approuve', color: GREEN, icon: <Check size={12} /> },
  }

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Video size={16} color={GOLD} />
        <h4 style={{ fontFamily: FONT_ALT, fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>
          MES VIDEOS ({feedbacks.length})
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {feedbacks.map(fb => {
          const info = statusInfo[fb.status] || statusInfo.pending
          const isExpanded = expanded === fb.id

          return (
            <div key={fb.id}
              onClick={() => setExpanded(isExpanded ? null : fb.id)}
              style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 14, cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, fontFamily: FONT_BODY }}>{fb.exercise_name}</span>
                  <span style={{ fontSize: 11, color: TEXT_DIM, marginLeft: 8, fontFamily: FONT_BODY }}>{new Date(fb.created_at).toLocaleDateString('fr-CH')}</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: info.color, background: `${info.color}15`, border: `1px solid ${info.color}30`, borderRadius: 12, padding: '3px 10px', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {info.icon} {info.label}
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12 }}>
                  <video src={fb.video_url} controls style={{ width: '100%', borderRadius: 12, maxHeight: 200, marginBottom: 8 }} />
                  {fb.client_note && (
                    <p style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic', margin: '0 0 8px', fontFamily: FONT_BODY }}>Toi : "{fb.client_note}"</p>
                  )}
                  {fb.coach_feedback && (
                    <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD, padding: 10, marginTop: 4 }}>
                      <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: FONT_ALT }}>Feedback coach</p>
                      <p style={{ fontSize: 13, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.5, fontFamily: FONT_BODY }}>{fb.coach_feedback}</p>
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
