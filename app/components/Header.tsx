'use client'
import { useEffect, useRef, useState } from 'react'
import { Calendar, MessageCircle } from 'lucide-react'
import { colors, fonts } from '../../lib/design-tokens'

interface HeaderProps {
  firstName: string
  displayAvatar?: string
  objective?: string
  unreadCount: number
  onCalendar?: () => void
  onMessages?: () => void
  onAvatar?: () => void
  onLogo?: () => void
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export default function Header({ firstName, displayAvatar, objective, unreadCount, onCalendar, onMessages, onAvatar, onLogo, scrollContainerRef }: HeaderProps) {
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
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.12)',
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
        background: 'rgba(14,14,14,0.95)',
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 16,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        backdropFilter: 'blur(16px)',
      }}>
        {/* Avatar */}
        <button onClick={onAvatar} style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'rgba(201,168,76,0.1)', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: colors.gold }}>{firstName?.[0]?.toUpperCase() || 'M'}</span>
          )}
        </button>

        {/* Name + objective */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{firstName}</div>
          <div style={{ fontFamily: fonts.body, fontSize: 8, fontWeight: 600, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{objLabel}</div>
        </div>

        {/* Logo MX */}
        <button onClick={onLogo} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
          <span style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.gold, letterSpacing: '0.15em' }}>MX</span>
        </button>

        {/* Icons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onCalendar} style={iconBtn}>
            <Calendar size={14} color={colors.gold} strokeWidth={1.5} />
          </button>
          <button onClick={onMessages} style={iconBtn}>
            <MessageCircle size={14} color={colors.gold} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: colors.gold, border: '2px solid rgba(14,14,14,0.95)' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
