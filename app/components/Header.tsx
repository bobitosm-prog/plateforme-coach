'use client'
import { useEffect, useRef, useState } from 'react'
import { Calendar, MessageCircle, Sparkles } from 'lucide-react'
import { colors, fonts } from '../../lib/design-tokens'

interface HeaderProps {
  firstName: string
  displayAvatar?: string
  objective?: string
  unreadCount: number
  onCoachIA?: () => void
  aiAllowed?: boolean
  onCalendar?: () => void
  onMessages?: () => void
  onAvatar?: () => void
  onObjectiveChange?: () => void
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export default function Header({ firstName, displayAvatar, objective, unreadCount, onCoachIA, aiAllowed, onCalendar, onMessages, onAvatar, onObjectiveChange, scrollContainerRef }: HeaderProps) {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    // Attach to scroll container div (not window) since the app uses overflow-y: auto
    const el = scrollContainerRef?.current || document.querySelector('.client-main-scroll') || window
    function onScroll() {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = el === window ? window.scrollY : (el as HTMLElement).scrollTop
        if (y > lastScrollY.current + 10) setVisible(false)
        else if (y < lastScrollY.current - 10) setVisible(true)
        lastScrollY.current = y
        ticking.current = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollContainerRef])

  const objLabel = objective === 'weight_loss' || objective === 'seche' ? 'SÈCHE'
    : objective === 'mass' || objective === 'bulk' ? 'PRISE DE MASSE' : 'MAINTIEN'

  const iconBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    background: colors.goldDim,
    border: `1px solid ${colors.goldBorder}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative',
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '8px 20px',
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.3s ease',
    }}>
      <div style={{
        background: `${colors.surface}f2`,
        border: `1px solid ${colors.goldBorder}`,
        borderRadius: 16,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        backdropFilter: 'blur(16px)',
      }}>
        {/* Avatar */}
        <button onClick={onAvatar} style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `${colors.gold}1a`, border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: colors.gold }}>{firstName?.[0]?.toUpperCase() || 'M'}</span>
          )}
        </button>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{firstName}</div>
        </div>

        {/* Objective pill + Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onObjectiveChange} style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${colors.gold}1a`, border: `0.5px solid ${colors.gold}33`, borderRadius: 999, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontFamily: fonts.headline, fontSize: 7, fontWeight: 700, color: colors.gold, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>{objLabel}</span>
            <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>▼</span>
          </button>
          {aiAllowed !== false && (
            <button onClick={onCoachIA} style={iconBtn}>
              <Sparkles size={16} color={colors.gold} strokeWidth={1.5} />
            </button>
          )}
          <button onClick={onCalendar} style={iconBtn}>
            <Calendar size={16} color={colors.gold} strokeWidth={1.5} />
          </button>
          <button onClick={onMessages} style={iconBtn}>
            <MessageCircle size={16} color={colors.gold} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: colors.gold, border: `2px solid ${colors.surface}f2` }} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
