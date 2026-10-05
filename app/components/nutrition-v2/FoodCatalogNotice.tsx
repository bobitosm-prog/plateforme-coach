'use client'
import { useTranslations } from 'next-intl'

/** Inline disclosure stays readable inside the native iPhone shell. */
export default function FoodCatalogNotice() {
  const t = useTranslations('food_catalog')
  return <details style={{ fontSize: 12, lineHeight: 1.5, color: '#B9B3A5', margin: '8px 0', overflowWrap: 'anywhere' }}>
    <summary style={{ cursor: 'pointer', minHeight: 32 }}>{t('title')}</summary>
    <p>{t('source')}</p>
    <p>{t('values')}</p>
    <p>{t('fitness')}</p>
    <p><a href="https://doi.org/10.57745/RDMHWY" target="_blank" rel="noopener noreferrer">ANSES · Ciqual 2025</a>{' · '}
      <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" target="_blank" rel="noopener noreferrer">Licence Ouverte 2.0</a></p>
  </details>
}
