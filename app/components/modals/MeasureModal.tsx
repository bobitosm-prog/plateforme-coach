'use client'
import { useId, useRef, useState } from 'react'
import { format, type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useTranslations, useLocale } from 'next-intl'
import {
  BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_RULE,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD, colors,
} from '../../../lib/design-tokens'
import DashboardMeasurementDialogShell from './DashboardMeasurementDialogShell'

interface MeasureModalProps {
  measurements: any[]
  onSave: (data: Record<string, number>, date: string) => Promise<void>
  onClose: () => void
}

const MEASURE_KEYS = ['waist', 'hips', 'chest', 'arms', 'thighs'] as const

export default function MeasureModal({ measurements, onSave, onClose }: MeasureModalProps) {
  const reactId = useId()
  const firstMeasureInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('progress')
  const locale = useLocale()
  const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const MEASURE_FIELDS = MEASURE_KEYS.map(key => ({
    key,
    label: t(`tab.measureLabels.${key}`),
    shortLabel: t(`tab.graphLabels.${key === 'arms' ? 'arms' : key}`),
    unit: 'cm',
  }))
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({
    waist: '', hips: '', chest: '', arms: '', thighs: '',
  })
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function handleSave() {
    const data: Record<string, number> = {}
    Object.entries(measureForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v) })
    if (Object.keys(data).length === 0) return
    await onSave(data, date)
  }

  const hasValue = Object.values(measureForm).some(v => v !== '')
  const last5 = measurements.slice(0, 5)

  return (
    <DashboardMeasurementDialogShell
      title={t('measureModal.title')}
      initialFocusRef={firstMeasureInputRef}
      onClose={onClose}
      overlayStyle={{ overflowY: 'auto' }}
      panelStyle={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 40px', marginTop: 64, minHeight: '90vh' }}
      headerMarginBottom={24}
    >

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {MEASURE_FIELDS.map(({ key, label, unit }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px' }}>
              <label htmlFor={`dashboard-measure-${key}-${reactId}`} style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, flex: 1 }}>{label}</label>
              <input
                ref={key === MEASURE_KEYS[0] ? firstMeasureInputRef : undefined}
                id={`dashboard-measure-${key}-${reactId}`}
                type="number"
                step="0.1"
                value={measureForm[key]}
                onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="—"
                style={{ background: 'transparent', color: GOLD, fontSize: '0.95rem', fontFamily: FONT_DISPLAY, fontWeight: 700, textAlign: 'right', width: 64, outline: 'none', border: 'none' }}
              />
              <span style={{ color: TEXT_MUTED, fontSize: '0.75rem', width: 24, fontFamily: FONT_ALT }}>{unit}</span>
            </div>
          ))}
        </div>

        {/* Date */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor={`dashboard-measure-date-${reactId}`} style={{ display: 'block', fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: TEXT_MUTED, marginBottom: 8 }}>{t('measureModal.date')}</label>
          <input
            id={`dashboard-measure-date-${reactId}`}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.95rem', outline: 'none', colorScheme: 'dark', fontFamily: FONT_BODY }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, padding: '16px', borderRadius: 12, cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms' }}
          >
            {t('measureModal.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasValue}
            style={{ flex: 2, background: hasValue ? GOLD : '#2A2A2A', color: hasValue ? colors.onGold : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 800, padding: '16px', borderRadius: 12, border: 'none', cursor: hasValue ? 'pointer' : 'default', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 200ms',  }}
          >
            {t('measureModal.save')}
          </button>
        </div>

        {/* History */}
        {last5.length > 0 && (
          <div>
            <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 12 }}>{t('measureModal.history')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {last5.map((m: any, i: number) => (
                <div key={m.id || i} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? GOLD : TEXT_MUTED }}>
                      {format(new Date(m.date), 'd MMM yyyy', { locale: dateLocale })}
                    </span>
                    {i === 0 && <span style={{ fontSize: '0.62rem', color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: FONT_ALT }}>{t('measureModal.latest')}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                    {MEASURE_FIELDS.map(({ key, shortLabel }) => {
                      const val = m[key]
                      return val ? (
                        <div key={key} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.95rem', fontFamily: FONT_DISPLAY, fontWeight: 700, color: GOLD }}>{val}</div>
                          <div style={{ fontSize: '0.56rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_ALT }}>{shortLabel}</div>
                        </div>
                      ) : (
                        <div key={key} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.95rem', color: TEXT_MUTED, fontFamily: FONT_DISPLAY }}>—</div>
                          <div style={{ fontSize: '0.56rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_ALT }}>{shortLabel}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </DashboardMeasurementDialogShell>
  )
}
