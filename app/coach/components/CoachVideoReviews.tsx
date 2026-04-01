'use client'
import { useEffect, useState } from 'react'

interface ExerciseFeedback {
  id: string
  coach_id: string
  client_id: string
  exercise_name: string
  video_url: string
  client_note: string | null
  status: string
  created_at: string
}

export default function CoachVideoReviews({ session, supabase }: { session: any; supabase: any }) {
  const [feedbacks, setFeedbacks] = useState<ExerciseFeedback[]>([])
  const [coachNotes, setCoachNotes] = useState<Record<string, string>>({})
  const [clientNames, setClientNames] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!session?.user?.id) return
    fetchPending()
  }, [session?.user?.id])

  async function fetchPending() {
    const { data } = await supabase
      .from('exercise_feedback')
      .select('*')
      .eq('coach_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!data || data.length === 0) {
      setFeedbacks([])
      return
    }
    setFeedbacks(data)

    // Fetch client names
    const clientIds = [...new Set(data.map((f: ExerciseFeedback) => f.client_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', clientIds)

    if (profiles) {
      const names: Record<string, string> = {}
      for (const p of profiles) {
        names[p.id] = p.full_name || p.id
      }
      setClientNames(names)
    }
  }

  async function handleAction(fb: ExerciseFeedback, newStatus: 'reviewed' | 'approved') {
    setSending(prev => ({ ...prev, [fb.id]: true }))
    const updateData: any = { status: newStatus }
    if (newStatus === 'reviewed' && coachNotes[fb.id]) {
      updateData.coach_feedback = coachNotes[fb.id]
    }
    await supabase
      .from('exercise_feedback')
      .update(updateData)
      .eq('id', fb.id)

    setFeedbacks(prev => prev.filter(f => f.id !== fb.id))
    setSending(prev => ({ ...prev, [fb.id]: false }))
  }

  if (feedbacks.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#C9A84C',
        marginBottom: 16,
      }}>
        {`VID\u00C9OS \u00C0 REVIEWER (${feedbacks.length})`}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {feedbacks.map(fb => (
          <div key={fb.id} style={{
            background: '#0d0d0d',
            border: '1px solid #1a1a1a',
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                color: '#fff',
                fontSize: 15,
              }}>
                {clientNames[fb.client_id] || fb.client_id}
              </span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#888',
                fontSize: 14,
                marginLeft: 12,
              }}>
                {fb.exercise_name}
              </span>
            </div>

            {fb.client_note && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontStyle: 'italic',
                color: '#777',
                fontSize: 13,
                margin: '0 0 12px',
              }}>
                {fb.client_note}
              </p>
            )}

            <video
              src={fb.video_url}
              controls
              playsInline
              style={{
                width: '100%',
                maxWidth: 480,
                borderRadius: 8,
                background: '#000',
                marginBottom: 12,
              }}
            />

            <textarea
              placeholder="Votre feedback..."
              value={coachNotes[fb.id] || ''}
              onChange={e => setCoachNotes(prev => ({ ...prev, [fb.id]: e.target.value }))}
              rows={3}
              style={{
                width: '100%',
                background: '#111',
                border: '1px solid #1a1a1a',
                borderRadius: 8,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                padding: '10px 12px',
                resize: 'vertical',
                marginBottom: 12,
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={sending[fb.id]}
                onClick={() => handleAction(fb, 'reviewed')}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#C9A84C',
                  color: '#000',
                  cursor: 'pointer',
                  opacity: sending[fb.id] ? 0.5 : 1,
                }}
              >
                Envoyer le feedback
              </button>
              <button
                disabled={sending[fb.id]}
                onClick={() => handleAction(fb, 'approved')}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid #2a2a2a',
                  background: 'transparent',
                  color: '#22C55E',
                  cursor: 'pointer',
                  opacity: sending[fb.id] ? 0.5 : 1,
                }}
              >
                &#10003; Approuver
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
