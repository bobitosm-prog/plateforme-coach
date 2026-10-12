'use client'

import styles from '../SecondaryPanels.module.css'
import { RailOverlay } from '../ui/RailOverlay'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { colors, fonts, Z_MODAL } from '../../../lib/app-design-tokens'

export interface SessionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sessionTitle: string
  dayStatus: 'today' | 'future' | 'done' | 'missed'
  dayBadge?: { text: string; color: string } | null
  children?: React.ReactNode
}

export default function SessionDetailModal({
  isOpen, onClose, sessionTitle, dayStatus, dayBadge, children,
}: SessionDetailModalProps) {
  const t = useTranslations('training_tab.sessionDetail')
  return <RailOverlay active={isOpen}>
    {isOpen && <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="session-detail-title"
      style={{position:'fixed',inset:0,zIndex:Z_MODAL,background:colors.background,display:'flex',flexDirection:'column',paddingTop:'env(safe-area-inset-top, 0px)'}}>
      <header style={{width:'100%',maxWidth:760,margin:'0 auto',padding:'24px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13,color:colors.gold,letterSpacing:'.08em',marginBottom:10}}>{dayBadge?.text || 'MOOVX'}</div>
          <h1 id="session-detail-title" style={{fontFamily:fonts.headline,fontSize:'clamp(28px,7vw,36px)',fontWeight:700,color:colors.gold,letterSpacing:'-.03em',lineHeight:1.12,margin:0,overflowWrap:'anywhere'}}>{sessionTitle}</h1>
        </div>
        <button aria-label={t('close')} onClick={onClose} style={{width:46,height:46,flexShrink:0,borderRadius:13,background:colors.surfaceCard,border:`1px solid ${colors.goldBorder}`,color:colors.gold,display:'grid',placeItems:'center',cursor:'pointer'}}><X size={22}/></button>
      </header>
      <div style={{flex:1,minHeight:0,overflowY:'auto',overscrollBehavior:'contain'}}><div style={{width:'100%',maxWidth:760,margin:'0 auto',padding:'0 20px calc(24px + env(safe-area-inset-bottom, 0px))'}}>
        {children || <p style={{fontSize:16,color:colors.textMuted}}>{t('placeholder')}</p>}
      </div></div>
    </div>}
  </RailOverlay>
}
