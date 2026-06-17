import { getTranslations } from 'next-intl/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export default async function BetaBanner({ locale }: { locale: string }) {
  const supabase = await createSupabaseRouteClient()
  const { data } = await supabase
    .from('beta_campaigns')
    .select('free_days, max_slots, used_slots, is_active')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!data || !data.is_active) return null
  const slotsLeft = data.max_slots - data.used_slots
  if (slotsLeft <= 0) return null

  const t = await getTranslations({ locale, namespace: 'beta_banner' })

  return (
    <div style={{
      background: 'linear-gradient(90deg, #1a1400 0%, #2a1f00 50%, #1a1400 100%)',
      borderBottom: '1px solid rgba(212,168,67,0.25)',
      padding: '10px 16px',
      textAlign: 'center',
      fontSize: 13,
      letterSpacing: '0.02em',
      lineHeight: 1.5,
    }}>
      <span style={{
        textDecoration: 'line-through',
        opacity: 0.5,
        color: '#999',
        marginRight: 8,
      }}>
        {t('strikethrough')}
      </span>
      <span style={{
        color: '#D4AF37',
        fontWeight: 700,
        letterSpacing: '0.06em',
        marginRight: 8,
      }}>
        {t('highlight', { days: data.free_days })}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.55)', margin: '0 6px' }}>·</span>
      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
        {t('slots', { left: slotsLeft, total: data.max_slots })}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.55)', margin: '0 6px' }}>·</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
        {t('feedback')}
      </span>
    </div>
  )
}
