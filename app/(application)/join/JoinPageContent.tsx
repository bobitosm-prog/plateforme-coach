'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  BG_BASE,
  BG_CARD,
  BORDER,
  FONT_ALT,
  FONT_BODY,
  FONT_DISPLAY,
  GOLD,
  RADIUS_CARD,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from '../../../lib/design-tokens'

export default function JoinPageContent() {
  const t = useTranslations('auth.join')

  return (
    <main
      style={{
        minHeight: '100vh',
        background: BG_BASE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_CARD,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <Image
          src="/logo-moovx.png"
          alt="MoovX"
          width={56}
          height={56}
          style={{ borderRadius: 12, marginBottom: 20 }}
        />
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 30,
            color: TEXT_PRIMARY,
            margin: '0 0 14px',
            letterSpacing: '2px',
          }}
        >
          {t('legacyUnavailable.title')}
        </h1>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 300,
            fontSize: 15,
            color: TEXT_MUTED,
            lineHeight: 1.65,
            margin: '0 0 28px',
          }}
        >
          {t('legacyUnavailable.message')}
        </p>
        <Link
          href="/register-client"
          style={{
            display: 'inline-block',
            background: GOLD,
            color: BG_BASE,
            borderRadius: 12,
            padding: '13px 20px',
            fontFamily: FONT_ALT,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.5px',
            textDecoration: 'none',
          }}
        >
          {t('legacyUnavailable.register')}
        </Link>
      </div>
    </main>
  )
}
