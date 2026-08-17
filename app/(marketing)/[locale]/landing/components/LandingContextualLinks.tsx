'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'

const LINK_GROUPS = {
  nutrition: {
    label: 'Ressources nutrition MoovX',
    links: [
      {
        href: '/fr/outils/calculateur-calories-macros',
        label: 'Estimer vos calories et vos macros',
      },
      {
        href: '/fr/guides/nutrition',
        label: 'Consulter le guide de la nutrition sportive',
      },
      {
        href: '/fr/nutrition/prise-de-masse',
        label: 'Construire une prise de masse progressive',
      },
    ],
  },
  training: {
    label: 'Ressource entraînement MoovX',
    links: [
      {
        href: '/fr/guides/musculation',
        label: 'Consulter le guide de musculation',
      },
    ],
  },
  coach: {
    label: 'Ressource coach sportif IA MoovX',
    links: [
      {
        href: '/fr/coach-sportif-ia',
        label: 'Découvrir comment fonctionne le coach sportif IA',
      },
    ],
  },
} as const

export type LandingContextualLinkGroup = keyof typeof LINK_GROUPS

export default function LandingContextualLinks({
  group,
}: {
  group: LandingContextualLinkGroup
}) {
  const locale = useLocale()

  if (locale !== 'fr') return null

  const linkGroup = LINK_GROUPS[group]

  return (
    <nav
      aria-label={linkGroup.label}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 20px',
        marginBottom: 24,
        maxWidth: 560,
      }}
    >
      {linkGroup.links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            color: 'var(--gold)',
            fontSize: 13,
            lineHeight: 1.5,
            textDecoration: 'underline',
            textDecorationColor: 'rgba(212,168,67,0.45)',
            textUnderlineOffset: 4,
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
