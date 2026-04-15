'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Heart, Dumbbell, BarChart3, UtensilsCrossed } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, titleStyle, bodyStyle, mutedStyle, subtitleStyle, cardStyle } from '../../lib/design-tokens'

const SUGGESTION_CARDS = [
  { label: 'Que manger ce soir ?', sub: 'Basé sur tes macros', icon: UtensilsCrossed, msg: 'Que manger ce soir en fonction de mes macros restantes ?' },
  { label: 'Optimiser ma séance', sub: 'Tips pour demain', icon: Dumbbell, msg: 'Comment optimiser ma prochaine séance d\'entraînement ?' },
  { label: 'Récupération', sub: 'Repos et stretching', icon: Heart, msg: 'Quels exercices de récupération et stretching me recommandes-tu ?' },
  { label: 'Mon bilan semaine', sub: 'Résumé et conseils', icon: BarChart3, msg: 'Fais-moi un bilan de ma semaine avec des conseils pour la suivante.' },
]

const QUICK_PILLS = [
  'Repas post-training ?',
  'Combien de protéines ?',
  'Remplacer un exercice',
  'Mes macros ce soir ?',
  'Plateau musculaire',
]

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${colors.gold}">$1</strong>`)
    .replace(/^## (.*$)/gm, `<div style="font-family:${fonts.headline};font-size:18px;color:${colors.gold};letter-spacing:2px;margin:12px 0 6px">$1</div>`)
    .replace(/^### (.*$)/gm, `<div style="font-family:${fonts.body};font-size:14px;font-weight:700;color:${colors.gold};letter-spacing:1px;margin:10px 0 4px;text-transform:uppercase">$1</div>`)
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
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: colors.background, zIndex: 1001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ ...titleStyle, fontSize: 24, letterSpacing: '0.1em', color: colors.text, marginBottom: 12 }}>COACH IA</div>
        <p style={{ ...bodyStyle, fontSize: 15, color: colors.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
          Ton coach gère ton programme et ta nutrition. Contacte-le directement via la messagerie.
        </p>
        <button onClick={() => { setOpen(false); onExternalClose?.() }} style={{ padding: '12px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${colors.goldRule}`, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: '0.1em', cursor: 'pointer' }}>FERMER</button>
      </div>
    )
  }

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const hasConversation = messages.length > 0

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
        style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 12, background: colors.gold, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${colors.goldRule}`, zIndex: 998 }}>
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
        style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: colors.background, zIndex: 1001, display: 'flex', flexDirection: 'column' }}
      >
        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* ═══ SECTION 1 — HEADER COACH ═══ */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'max(24px, env(safe-area-inset-top, 24px))', marginBottom: 20 }}>
            <button onClick={handleClose} style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top, 16px))', right: 0, width: 36, height: 36, borderRadius: 12, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, color: colors.textMuted, lineHeight: 1 }}>&times;</span>
            </button>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(230,195,100,0.1)', border: '1px solid rgba(230,195,100,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Bot size={28} color={colors.gold} strokeWidth={2} />
            </div>
            <div style={{ fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, color: colors.text, letterSpacing: '0.08em', marginBottom: 6 }}>COACH MOOVX</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: '#22c55e' }}>EN LIGNE</span>
            </div>
          </div>

          {/* ═══ SECTION 2 — RÉSUMÉ PROFIL ═══ */}
          <div style={{ ...cardStyle, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.gold, letterSpacing: '0.12em', marginBottom: 10 }}>TON RÉSUMÉ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.text }}>{profile?.current_weight || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>KG</span></div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.gold }}>{profile?.calorie_goal || profile?.tdee || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>KCAL/J</span></div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.text }}>{profile?.sessions_per_week || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>SÉANCES</span></div>
              </div>
            </div>
          </div>

          {/* ═══ SECTION 3 — SUGGESTIONS RAPIDES (hidden when conversation started) ═══ */}
          {!hasConversation && (
            <>
              <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>SUGGESTIONS RAPIDES</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {SUGGESTION_CARDS.map(({ label, sub, icon: Icon, msg }) => (
                  <button key={label} onClick={() => sendMessage(msg)} style={{ background: colors.surface, border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 14, padding: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Icon size={16} color={colors.gold} strokeWidth={2} />
                    <div style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>{label}</div>
                    <div style={{ fontSize: 9, color: colors.textMuted }}>{sub}</div>
                  </button>
                ))}
              </div>

              {/* ═══ SECTION 4 — PILLS RAPIDES ═══ */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {QUICK_PILLS.map(pill => (
                  <button key={pill} onClick={() => sendMessage(pill)} style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: 'rgba(230,195,100,0.08)', border: `1px solid ${colors.goldBorder}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>
                    {pill}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ═══ SECTION 5 — WELCOME MESSAGE (no conversation) ═══ */}
          {!hasConversation && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(230,195,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} color={colors.gold} />
              </div>
              <div style={{ background: colors.surface, border: `1px solid rgba(201,168,76,0.12)`, borderRadius: '4px 14px 14px 14px', padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  Salut {firstName} ! {profile?.calorie_goal ? `Ton objectif est de ${profile.calorie_goal} kcal/jour.` : ''} Pose-moi une question sur ta nutrition, ton entraînement ou tes objectifs.
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECTION 6 — CONVERSATION ═══ */}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, marginBottom: 12 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(230,195,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bot size={14} color={colors.gold} />
                </div>
              )}
              <div>
                {msg.role === 'assistant' ? (
                  <div style={{ maxWidth: 280, padding: '12px 14px', background: colors.surface, border: `1px solid rgba(201,168,76,0.12)`, borderRadius: '4px 14px 14px 14px' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      style={{ ...bodyStyle, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }} />
                  </div>
                ) : (
                  <div style={{ maxWidth: 280, padding: '12px 14px', background: 'rgba(230,195,100,0.15)', border: '1px solid rgba(230,195,100,0.2)', borderRadius: '14px 14px 4px 14px', ...bodyStyle, fontSize: 12, color: colors.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                )}
                <div style={{ fontSize: 9, color: colors.textDim, marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {new Date(msg.timestamp).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(230,195,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} color={colors.gold} />
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '4px 14px 14px 14px', background: colors.surface, border: `1px solid rgba(201,168,76,0.12)` }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.gold, opacity: 0.5, animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: colors.error, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          <div ref={endRef} />
        </div>

        {/* ═══ INPUT BAR (fixed bottom) ═══ */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '12px 20px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          background: colors.surface,
          borderTop: `1px solid rgba(201,168,76,0.1)`,
          flexShrink: 0,
        }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pose ta question..."
            rows={1}
            style={{
              flex: 1, padding: '12px 16px',
              background: '#1a1a1a',
              border: `1px solid rgba(201,168,76,0.12)`,
              borderRadius: 14,
              color: colors.text, fontSize: 13,
              fontFamily: fonts.body, outline: 'none',
              resize: 'none', maxHeight: 80,
            }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: input.trim() ? `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})` : 'rgba(230,195,100,0.1)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: input.trim() ? 1 : 0.3,
            }}>
            <Send size={18} color={input.trim() ? '#0D0B08' : colors.textMuted} strokeWidth={2.5} />
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
