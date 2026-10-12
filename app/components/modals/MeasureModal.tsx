'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { RailOverlay } from '../ui/RailOverlay'
import panelStyles from '../SecondaryPanels.module.css'
import { X } from 'lucide-react'
import { format, type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useTranslations, useLocale } from 'next-intl'
import {
  BG_CARD_2, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_RULE,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD, colors,
} from '../../../lib/app-design-tokens'

interface MeasureModalProps {
  measurements: any[]
  onSave: (data: Record<string, number>, date: string) => Promise<void>
  onClose: () => void
}

const MEASURE_KEYS = ['waist', 'hips', 'chest', 'biceps', 'thighs', 'calves'] as const

export default function MeasureModal({ measurements, onSave, onClose }: MeasureModalProps) {
  const t = useTranslations('progress')
  const locale = useLocale()
  const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const MEASURE_FIELDS = MEASURE_KEYS.map(key => ({
    key,
    label: t(`tab.measureLabels.${key === 'biceps' ? 'arms' : key}`),
    shortLabel: t(`tab.graphLabels.${key === 'biceps' ? 'arms' : key}`),
    unit: 'cm',
  }))
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({
    waist: '', hips: '', chest: '', biceps: '', thighs: '', calves: '',
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
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
      <RailOverlay>
        <Dialog.Overlay className={panelStyles.backdrop} />
        <Dialog.Content className={`${panelStyles.panel} ${panelStyles.measureSheet}`} aria-describedby={undefined} onInteractOutside={event => event.preventDefault()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Dialog.Title style={{ fontFamily: FONT_DISPLAY, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: TEXT_PRIMARY }}>{t('measureModal.title')}</Dialog.Title>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 44, height: 44, flexShrink: 0, background: BG_CARD_2, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} color={TEXT_MUTED} /></button>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {MEASURE_FIELDS.map(({ key, label, unit }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 16px' }}>
                <label htmlFor={`measure-${key}`} style={{ fontSize: 14, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT_MUTED, flex: 1 }}>{label}</label>
                <input
                  id={`measure-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={measureForm[key]}
                  onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="—"
                  style={{ background: 'transparent', color: GOLD, fontSize: '1rem', fontFamily: FONT_DISPLAY, fontWeight: 700, textAlign: 'right', width: 80, outline: 'none', border: 'none' }}
                />
                <span style={{ color: TEXT_MUTED, fontSize: '0.875rem', width: 24, fontFamily: FONT_ALT }}>{unit}</span>
              </div>
            ))}
          </div>

          {/* Date */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="measure-date" style={{ display: 'block', fontSize: 14, fontFamily: FONT_ALT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: TEXT_MUTED, marginBottom: 8 }}>{t('measureModal.date')}</label>
            <input
              id="measure-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 16px', color: TEXT_PRIMARY, fontSize: '1rem', outline: 'none', colorScheme: 'dark', fontFamily: FONT_BODY }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, background: 'transparent', border: `1px solid ${GOLD_RULE}`, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontWeight: 700, padding: '16px', borderRadius: 12, cursor: 'pointer', fontSize: '1rem', letterSpacing: 0, textTransform: 'none', transition: 'background-color 150ms' }}
            >
              {t('measureModal.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasValue}
              style={{ flex: 2, background: hasValue ? GOLD : '#2A2A2A', color: hasValue ? colors.onGold : TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 800, padding: '16px', borderRadius: 12, border: 'none', cursor: hasValue ? 'pointer' : 'default', fontSize: '1rem', letterSpacing: 0, textTransform: 'none', transition: 'background-color 150ms',  }}
            >
              {t('measureModal.save')}
            </button>
          </div>

          {/* History */}
          {last5.length > 0 && (
            <div>
              <span style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 12 }}>{t('measureModal.history')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {last5.map((m: any, i: number) => (
                  <div key={m.id || i} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '8px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: FONT_ALT, fontSize: '0.875rem', fontWeight: 700, color: i === 0 ? GOLD : TEXT_MUTED }}>
                        {format(new Date(m.date), 'd MMM yyyy', { locale: dateLocale })}
                      </span>
                      {i === 0 && <span style={{ fontSize: '0.75rem', color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: FONT_ALT }}>{t('measureModal.latest')}</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {MEASURE_FIELDS.map(({ key, shortLabel }) => {
                        const val = m[key]
                        return val ? (
                          <div key={key} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontFamily: FONT_DISPLAY, fontWeight: 700, color: GOLD }}>{val}</div>
                            <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_ALT }}>{shortLabel}</div>
                          </div>
                        ) : (
                          <div key={key} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', color: TEXT_MUTED, fontFamily: FONT_DISPLAY }}>—</div>
                            <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT_ALT }}>{shortLabel}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Dialog.Content>
      </RailOverlay>
    </Dialog.Root>
  )
}
