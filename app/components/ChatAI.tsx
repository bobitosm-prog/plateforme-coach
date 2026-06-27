'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Heart, Dumbbell, BarChart3, UtensilsCrossed, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { colors, fonts, titleStyle, bodyStyle, mutedStyle, subtitleStyle, cardStyle, Z_MODAL, Z_FAB } from '../../lib/design-tokens'
import { useChatAI } from '../hooks/useChatAI'

const SUGGESTION_ICONS = [UtensilsCrossed, Dumbbell, Heart, BarChart3]

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${colors.gold}">$1</strong>`)
    .replace(/^## (.*$)/gm, `<div style="font-family:${fonts.headline};font-size:18px;color:${colors.gold};letter-spacing:2px;margin:12px 0 6px">$1</div>`)
    .replace(/^### (.*$)/gm, `<div style="font-family:${fonts.body};font-size:14px;font-weight:700;color:${colors.gold};letter-spacing:1px;margin:10px 0 4px;text-transform:uppercase">$1</div>`)
    .replace(/^- (.*$)/gm, '<div style="padding-left:12px;margin:2px 0">• $1</div>')
    .replace(/\n/g, '<br/>')
}

interface ChatAIProps {
  session: any
  profile: any
  externalOpen?: boolean
  onExternalClose?: () => void
  hideFloatingButton?: boolean
}

export default function ChatAI({ session, profile, externalOpen, onExternalClose, hideFloatingButton }: ChatAIProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const isInvited = profile?.subscription_type === 'invited'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  if (isInvited && open) {
    return (
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: colors.background, zIndex: Z_MODAL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ ...titleStyle, fontSize: 24, letterSpacing: '0.1em', color: colors.text, marginBottom: 12 }}>{t('invited.title')}</div>
        <p style={{ ...bodyStyle, fontSize: 15, color: colors.textMuted, lineHeight: 1.6, marginBottom: 24 }}>{t('invited.message')}</p>
        <button onClick={() => { setOpen(false); onExternalClose?.() }} style={{ padding: '12px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${colors.goldRule}`, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: '0.1em', cursor: 'pointer' }}>{t('invited.close')}</button>
      </div>
    )
  }

  const {
    messages,
    loading: historyLoading,
    sending,
    error: hookError,
    sendMessage: persistedSend,
    clearHistory,
  } = useChatAI()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }
  }, [messages.length, sending, open])

  async function handleSend(text?: string) {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setInput('')
    try {
      await persistedSend(msg)
    } catch (err) {
      console.error(err)
    }
  }

  function handleClose() {
    setOpen(false)
    onExternalClose?.()
  }

  if (!open) {
    if (hideFloatingButton) return null
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300) }}
        style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 12, background: colors.gold, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${colors.goldRule}`, zIndex: Z_FAB }}>
        <Bot size={24} color="#0D0B08" strokeWidth={2.5} />
      </button>
    )
  }

  const calorieContext = profile?.calorie_goal ? t('welcomeCalorie', { calorieGoal: profile.calorie_goal }) : ''

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="chat-ai-panel"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', background: colors.background, zIndex: Z_MODAL, display: 'flex', flexDirection: 'column' }}
      >
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* Header */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'max(24px, env(safe-area-inset-top, 24px))', marginBottom: 20 }}>
            <div style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top, 16px))', right: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              {messages.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm(t('clearConfirm'))) {
                      await clearHistory()
                    }
                  }}
                  aria-label={t('clearLabel')}
                  title={t('clearLabel')}
                  style={{ width: 36, height: 36, borderRadius: 12, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, transition: 'opacity 200ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
                >
                  <Trash2 size={14} color={colors.textMuted} />
                </button>
              )}
              <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: 12, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, color: colors.textMuted, lineHeight: 1 }}>&times;</span>
              </button>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${colors.gold}1a`, border: `1px solid ${colors.gold}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Bot size={28} color={colors.gold} strokeWidth={2} />
            </div>
            <div style={{ fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, color: colors.text, letterSpacing: '0.08em', marginBottom: 6 }}>{t('header.title')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.success }} />
              <span style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.success }}>{t('header.online')}</span>
            </div>
          </div>

          {/* Profile summary */}
          <div style={{ ...cardStyle, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.gold, letterSpacing: '0.12em', marginBottom: 10 }}>{t('summary.title')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.text }}>{profile?.current_weight || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>{t('summary.kg')}</span></div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.gold }}>{profile?.calorie_goal || profile?.tdee || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>{t('summary.kcalDay')}</span></div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.text }}>{profile?.sessions_per_week || '—'}<span style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>{t('summary.sessions')}</span></div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {historyLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 32, color: colors.textMuted, fontSize: 13, fontFamily: fonts.body }}>
              {t('loading')}
            </div>
          )}

          {/* Suggestions */}
          {!historyLoading && !hasConversation && (
            <>
              <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>{t('suggestions.title')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[0, 1, 2, 3].map(i => {
                  const Icon = SUGGESTION_ICONS[i]
                  return (
                    <button key={i} onClick={() => handleSend(t(`suggestions.cards.${i}.msg`))} style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 14, padding: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Icon size={16} color={colors.gold} strokeWidth={2} />
                      <div style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>{t(`suggestions.cards.${i}.label`)}</div>
                      <div style={{ fontSize: 9, color: colors.textMuted }}>{t(`suggestions.cards.${i}.sub`)}</div>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <button key={i} onClick={() => handleSend(t(`suggestions.pills.${i}`))} style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: colors.goldDim, border: `1px solid ${colors.goldBorder}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>
                    {t(`suggestions.pills.${i}`)}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Welcome */}
          {!historyLoading && !hasConversation && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} color={colors.gold} />
              </div>
              <div style={{ background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: '4px 14px 14px 14px', padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {t('welcome', { firstName, calorieContext })}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, marginBottom: 12 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bot size={14} color={colors.gold} />
                </div>
              )}
              <div>
                {msg.role === 'assistant' ? (
                  <div style={{ maxWidth: 280, padding: '12px 14px', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: '4px 14px 14px 14px' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      style={{ ...bodyStyle, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }} />
                  </div>
                ) : (
                  <div style={{ maxWidth: 280, padding: '12px 14px', background: colors.goldBorder, border: `1px solid ${colors.gold}33`, borderRadius: '14px 14px 4px 14px', ...bodyStyle, fontSize: 12, color: colors.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                )}
                <div style={{ fontSize: 9, color: colors.textDim, marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Sending indicator */}
          {sending && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} color={colors.gold} />
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '4px 14px 14px 14px', background: colors.surface, border: `1px solid ${colors.goldBorder}` }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.gold, opacity: 0.5, animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {hookError && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 12, marginBottom: 12, fontFamily: fonts.body }}>
              {hookError}
            </div>
          )}

          <div style={{ height: 1 }} />
        </div>

        {/* Input */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '12px 20px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          background: colors.surface,
          borderTop: `1px solid ${colors.goldBorder}`,
          flexShrink: 0,
        }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={t('input.placeholder')}
            rows={1}
            style={{
              flex: 1, padding: '12px 16px',
              background: colors.surfaceHigh,
              border: `1px solid ${colors.goldBorder}`,
              borderRadius: 14,
              color: colors.text, fontSize: 13,
              fontFamily: fonts.body, outline: 'none',
              resize: 'none', maxHeight: 80,
            }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: input.trim() && !sending ? `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})` : `${colors.gold}1a`,
              border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: input.trim() && !sending ? 1 : 0.3,
            }}>
            <Send size={18} color={input.trim() && !sending ? '#0D0B08' : colors.textMuted} strokeWidth={2.5} />
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
