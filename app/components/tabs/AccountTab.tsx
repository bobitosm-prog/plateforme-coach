'use client'
import { colors, fonts } from '../../../lib/design-tokens'

interface AccountTabProps {
  unreadCount?: number
  onNavigate?: (tab: string) => void
}

export default function AccountTab({ unreadCount = 0, onNavigate }: AccountTabProps) {
  return (
    <div style={{
      padding: '24px 20px',
      minHeight: '100vh',
      background: colors.background,
    }}>
      <h1 style={{
        fontFamily: fonts.headline,
        fontSize: 28,
        color: colors.gold,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        margin: 0,
        marginBottom: 8,
      }}>
        COMPTE
      </h1>
      <p style={{
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.textDim,
        margin: 0,
      }}>
        Hub Profil + Messages + Coach IA — en cours de construction.
      </p>
    </div>
  )
}
