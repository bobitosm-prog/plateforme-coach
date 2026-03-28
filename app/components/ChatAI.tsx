'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const GOLD = '#C9A84C'
const BG = '#0a0a0a'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const SUGGESTIONS = [
  'Comment atteindre mes macros ?',
  'Quel exercice pour les pectoraux ?',
  'Comment perdre du gras ?',
  'Combien de protéines par jour ?',
  'Remplacer un aliment du plan ?',
]

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
}

export default function ChatAI({ session, profile }: ChatAIProps) {
  const [open, setOpen] = useState(false)
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
      if (saved) setMessages(JSON.parse(saved).slice(-20))
    } catch {}
  }, [])

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20))) } catch {}
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
      if (data.hour !== currentHour) return true // new hour
      return data.count < 20
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
    if (!checkRate()) { setError('Limite atteinte (20/h). Réessaie dans quelques minutes.'); return }

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

  // Floating button
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300) }}
        style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(201,168,76,0.3)', zIndex: 998 }}>
        <Bot size={24} color="#000" strokeWidth={2.5} />
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
        style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: 'calc(100dvh - 0px)', background: BG, zIndex: 1001, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BORDER}` }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: TEXT, letterSpacing: '0.04em' }}>COACH IA</div>
              <div style={{ fontSize: '0.6rem', color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={9} color={GOLD} /> Propulsé par Claude
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={MUTED} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Bot size={40} color={GOLD} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Salut {profile?.full_name?.split(' ')[0] || ''} !</p>
              <p style={{ fontSize: '0.82rem', color: MUTED, margin: 0, lineHeight: 1.5 }}>Pose-moi une question sur ta nutrition, ton entraînement ou tes objectifs.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '10px 14px', fontSize: '0.85rem', lineHeight: 1.55, color: TEXT,
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? CARD : 'rgba(201,168,76,0.06)',
                border: msg.role === 'assistant' ? `1px solid rgba(201,168,76,0.15)` : 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.15)` }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.5, animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: '0.75rem', color: '#EF4444', textAlign: 'center' }}>{error}</p>}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)} style={{ fontSize: '0.7rem', fontWeight: 500, color: GOLD, background: 'transparent', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 20, padding: '6px 12px', cursor: 'pointer', transition: 'all 150ms' }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pose ta question..."
            rows={1}
            style={{ flex: 1, background: '#111', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '10px 14px', color: TEXT, fontSize: '0.88rem', outline: 'none', resize: 'none', maxHeight: 100, fontFamily: "'DM Sans', sans-serif" }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 40, height: 40, borderRadius: 12, background: input.trim() ? `linear-gradient(135deg, ${GOLD}, #D4AF37)` : '#222', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 150ms' }}>
            <Send size={18} color={input.trim() ? '#000' : MUTED} strokeWidth={2.5} />
          </button>
        </div>

        <style>{`
          @keyframes dotPulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          @media (min-width: 768px) { .chat-ai-panel { height: calc(100dvh - 80px) !important; bottom: 0 !important; border-radius: 16px 0 0 0 !important; } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
