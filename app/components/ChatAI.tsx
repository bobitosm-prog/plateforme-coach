'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Heart, Dumbbell, BarChart3, UtensilsCrossed, Trash2 } from 'lucide-react'
import { RailOverlay } from './ui/RailOverlay'
import { useTranslations, useLocale } from 'next-intl'
import { colors, fonts, titleStyle, bodyStyle, Z_MODAL, Z_FAB } from '../../lib/app-design-tokens'
import styles from './ChatAI.module.css'
import { useChatAI } from '../hooks/useChatAI'
import AthenaMessageContent from './AthenaMessageContent'
import type { UserCapabilities } from '../../lib/entitlements/capabilities'

const SUGGESTION_ICONS = [UtensilsCrossed, Dumbbell, Heart, BarChart3]

interface ChatAIProps {
  session: any
  profile: any
  capabilities: UserCapabilities
  externalOpen?: boolean
  onExternalClose?: () => void
  hideFloatingButton?: boolean
}

export default function ChatAI({ session, profile, capabilities, externalOpen, onExternalClose, hideFloatingButton }: ChatAIProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const common = useTranslations('training_tab.sessionDetail')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

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
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' })
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [messages.length, sending, open])

  async function handleSend(text?: string) {
    const msg = (text || input).trim()
    if (!msg || sending || !capabilities.ai) return
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

  if (!capabilities.ai && open) {
    return (
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={t('coachManaged.title')} style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: 420, height: '100dvh', background: colors.background, zIndex: Z_MODAL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ ...titleStyle, fontSize: 24, letterSpacing: '0.1em', color: colors.text, marginBottom: 12 }}>{t('coachManaged.title')}</div>
        <p style={{ ...bodyStyle, fontSize: 15, color: colors.textMuted, lineHeight: 1.6, marginBottom: 24 }}>{t('coachManaged.message')}</p>
        <button onClick={() => { setOpen(false); onExternalClose?.() }} style={{ padding: '12px 28px', borderRadius: 12, background: 'transparent', border: `1px solid ${colors.goldRule}`, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: '0.1em', cursor: 'pointer' }}>{t('coachManaged.close')}</button>
      </div>
    )
  }

  if (!open) {
    if (hideFloatingButton) return null
    return (
      <button aria-label={t('header.title')} onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300) }}
        style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 12, background: colors.gold, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${colors.goldRule}`, zIndex: Z_FAB }}>
        <Bot size={24} color="#0D0B08" strokeWidth={2.5} />
      </button>
    )
  }

  const calorieContext = profile?.calorie_goal ? t('welcomeCalorie', { calorieGoal: profile.calorie_goal }) : ''

  return (
    <RailOverlay>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="athena-title">
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>MOOVX</span><h1 id="athena-title">Athena<span>.</span></h1></div>
          <div className={styles.actions}>
            {hasConversation && <button aria-label={t('clearLabel')} onClick={async()=>{if(confirm(t('clearConfirm'))) await clearHistory()}}><Trash2 size={20}/></button>}
            <button onClick={handleClose} aria-label={common('close')}>✕</button>
          </div>
        </header>
        <div ref={scrollRef} className={styles.scroll}>
          <div className={styles.content}>
            {!hasConversation && <>
              <div className={styles.welcome}><Bot size={28}/><p>{t('welcome', { firstName, calorieContext })}</p></div>
              <details className={styles.summary}><summary>{t('summary.title')}</summary><div>
                <span>{profile?.current_weight || '—'} {t('summary.kg')}</span>
                <span>{profile?.calorie_goal || profile?.tdee || '—'} {t('summary.kcalDay')}</span>
                <span>{profile?.sessions_per_week || '—'} {t('summary.sessions')}</span>
              </div></details>
            </>}
            {historyLoading && <p role="status">{t('loading')}</p>}
            {!historyLoading && !hasConversation && <div className={styles.suggestions}>
              {[0,1,2,3].map(i=>{const Icon=SUGGESTION_ICONS[i];return <button key={i} onClick={()=>handleSend(t(`suggestions.cards.${i}.msg`))}><Icon size={22}/><span><strong>{t(`suggestions.cards.${i}.label`)}</strong><small>{t(`suggestions.cards.${i}.sub`)}</small></span></button>})}
            </div>}
            {messages.map(msg=><article key={msg.id} className={msg.role==='user'?styles.userMessage:styles.assistantMessage}>
              <div className={styles.messageLabel}>{msg.role==='assistant'?'Athena':firstName}</div>
              <div className={styles.messageBody}>{msg.role==='assistant'?<AthenaMessageContent content={msg.content}/>:msg.content}</div>
              <time>{new Date(msg.created_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</time>
            </article>)}
            {sending && <p role="status" className={styles.pending}>Athena…</p>}
            {hookError && <p role="alert" className={styles.error}>{hookError}</p>}
          </div>
        </div>
        <div className={styles.composer}><div>
          <textarea ref={inputRef} aria-label={t('input.placeholder')} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();handleSend()}}} placeholder={t('input.placeholder')} rows={2}/>
          <button aria-label={t('input.send')} onClick={()=>handleSend()} disabled={!input.trim()||sending}><Send size={22}/></button>
        </div></div>
      </section>
    </RailOverlay>
  )
}
