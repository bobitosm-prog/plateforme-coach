'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'
function getSuggestions(): string[] {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return [
    'Que manger avant ma séance ce matin ?',
    'Comment bien m\'échauffer ?',
    'Mon programme du jour ?',
  ]
  if (h >= 12 && h < 18) return [
    'Repas post-entraînement idéal ?',
    'Comment optimiser ma récupération ?',
    'Mes macros pour ce soir ?',
  ]
  if (h >= 18 && h < 23) return [
    'Que manger avant de dormir ?',
    'Comment améliorer mon sommeil pour progresser ?',
    'Bilan de ma journée nutritionnelle ?',
  ]
  return [
    'Comment atteindre mes macros ?',
    'Combien de protéines par jour ?',
    'Mon programme du jour ?',
  ]
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#D4A843">$1</strong>')
    .replace(/^## (.*$)/gm, '<div style="font-family:\'Bebas Neue\';font-size:18px;color:#D4A843;letter-spacing:2px;margin:12px 0 6px">$1</div>')
    .replace(/^### (.*$)/gm, '<div style="font-family:\'Barlow Condensed\';font-size:14px;font-weight:700;color:#D4A843;letter-spacing:1px;margin:10px 0 4px;text-transform:uppercase">$1</div>')
    .replace(/^- (.*$)/gm, '<div style="padding-left:12px;margin:2px 0">• $1</div>')
    .replace(/\n/g, '<br/>')
}

const STORAGE_KEY = 'moovx_chat_history'
const RATE_KEY = 'moovx_chat_rate'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatAIProps {
  session: any
  profile: any
  externalOpen?: boolean
  onExternalClose?: () => void
  hideFloatingButton?: boolean
}

export default function ChatAI({ session, profile, externalOpen, onExternalClose, hideFloatingButton }: ChatAIProps) {
  const isInvited = profile?.subscription_type === 'invited'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  // Invited clients see a disabled state
  if (isInvited && open) {
    return (
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: '#0D0B08', zIndex: 1001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 12 }}>COACH IA</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 24 }}>
          Ton coach gère ton programme et ta nutrition. Contacte-le directement via la messagerie.
        </p>
        <button onClick={() => { setOpen(false); onExternalClose?.() }} style={{ padding: '12px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>FERMER</button>
      </div>
    )
  }
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load history from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved).slice(-30))
    } catch {}
  }, [])

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))) } catch {}
    }
  }, [messages])

  // Scroll to bottom
  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, open])

  // Rate limiting
  function checkRate(): boolean {
    try {
      const raw = sessionStorage.getItem(RATE_KEY)
      const data = raw ? JSON.parse(raw) : { count: 0, hour: 0 }
      const currentHour = Math.floor(Date.now() / 3600000)
      if (data.hour !== currentHour) return true
      return data.count < 40
    } catch { return true }
  }

  function incrementRate() {
    try {
      const currentHour = Math.floor(Date.now() / 3600000)
      const raw = sessionStorage.getItem(RATE_KEY)
      const data = raw ? JSON.parse(raw) : { count: 0, hour: 0 }
      if (data.hour !== currentHour) {
        sessionStorage.setItem(RATE_KEY, JSON.stringify({ count: 1, hour: currentHour }))
      } else {
        sessionStorage.setItem(RATE_KEY, JSON.stringify({ count: data.count + 1, hour: currentHour }))
      }
    } catch {}
  }

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    if (!checkRate()) { setError('Limite atteinte (40/h). Réessaie dans quelques minutes.'); return }

    setInput('')
    setError('')
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-5),
          profile: profile ? {
            full_name: profile.full_name, current_weight: profile.current_weight,
            target_weight: profile.target_weight, height: profile.height,
            calorie_goal: profile.calorie_goal, protein_goal: profile.protein_goal,
            carbs_goal: profile.carbs_goal, fat_goal: profile.fat_goal,
            objective: profile.objective, activity_level: profile.activity_level,
            dietary_type: profile.dietary_type, gender: profile.gender, tdee: profile.tdee,
            fitness_score: profile.fitness_score, fitness_level: profile.fitness_level,
            sessions_per_week: profile.sessions_per_week,
            onboarding_answers: profile.onboarding_answers,
            fitness_objectives: profile.fitness_objectives,
          } : {},
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const aiMsg: ChatMessage = { role: 'assistant', content: data.message, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
      incrementRate()
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    onExternalClose?.()
  }

  // Floating button
  if (!open) {
    if (hideFloatingButton) return null
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300) }}
        style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 12, background: GOLD, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${colors.goldRule}`, zIndex: 998 }}>
        <Bot size={24} color="#0D0B08" strokeWidth={2.5} />
      </button>
    )
  }

  // Chat panel
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="chat-ai-panel"
        style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: '#0D0B08', zIndex: 1001, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header — glass */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          background: 'rgba(20,18,9,0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(212,168,67,0.1)',
          borderRadius: 18,
          margin: '12px 14px 0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} color="#0D0B08" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '2px', textTransform: 'uppercase' }}>COACH PERSONNEL</div>
              <div style={{ fontSize: '0.6rem', fontFamily: FONT_BODY, color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={9} color={GOLD} /> Ton coach MoovX
              </div>
            </div>
          </div>
          <button onClick={handleClose} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(138,133,128,0.1)', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color={TEXT_MUTED} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Bot size={40} color={GOLD} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontFamily: FONT_ALT, fontSize: '1.1rem', fontWeight: 800, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Salut {profile?.full_name?.split(' ')[0] || ''} !</p>
              <p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED, margin: 0, lineHeight: 1.5 }}>Pose-moi une question sur ta nutrition, ton entrainement ou tes objectifs.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' ? (
                <div style={{
                  maxWidth: '85%', padding: '14px 16px',
                  background: 'rgba(20,18,9,0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px 16px 16px 4px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06)',
                }}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    style={{ fontSize: 14, color: '#F5EDD8', lineHeight: 1.6, fontFamily: FONT_BODY, fontWeight: 300 }} />
                </div>
              ) : (
                <div style={{
                  maxWidth: '85%', padding: '14px 16px',
                  background: 'rgba(212,168,67,0.1)',
                  border: '1px solid rgba(212,168,67,0.25)',
                  borderRadius: '16px 16px 4px 16px',
                  fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.55,
                  fontFamily: FONT_BODY, fontWeight: 300,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '14px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(20,18,9,0.6)', border: '1px solid rgba(212,168,67,0.15)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.5, animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: '0.75rem', fontFamily: FONT_BODY, color: colors.error, textAlign: 'center' }}>{error}</p>}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {getSuggestions().map(s => (
              <button key={s} onClick={() => sendMessage(s)} style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: FONT_ALT, color: GOLD, background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 12, padding: '6px 12px', cursor: 'pointer', transition: 'all 150ms', letterSpacing: '0.5px' }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input — glass */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '12px 14px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          background: 'rgba(20,18,9,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(212,168,67,0.1)',
          flexShrink: 0,
        }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pose ta question..."
            rows={1}
            style={{
              flex: 1, padding: '12px 16px',
              background: '#141209',
              border: '1px solid rgba(212,168,67,0.15)',
              borderRadius: 14,
              color: '#F5EDD8', fontSize: 15,
              fontFamily: FONT_BODY, outline: 'none',
              resize: 'none', maxHeight: 100,
            }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: input.trim() ? GOLD : 'rgba(212,168,67,0.1)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 150ms',
            }}>
            <Send size={18} color={input.trim() ? '#0D0B08' : TEXT_MUTED} strokeWidth={2.5} />
          </button>
        </div>

        <style>{`
          @keyframes dotPulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          @media (min-width: 768px) { .chat-ai-panel { height: calc(100dvh - 80px) !important; bottom: 0 !important; border-radius: 2px 0 0 0 !important; } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
