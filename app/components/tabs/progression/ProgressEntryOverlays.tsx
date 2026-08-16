'use client'

import { useId, useRef } from 'react'
import DashboardMeasurementDialogShell from '../../modals/DashboardMeasurementDialogShell'
import { RailOverlay } from '../../ui/RailOverlay'
import { colors, fonts, bodyStyle, mutedStyle, radii, subtitleStyle } from '../../../../lib/design-tokens'
import type { ProgressTranslate } from './progress-tab-types'

const FIELDS = [{ key: 'waist', label: 'waist' }, { key: 'hips', label: 'hips' }, { key: 'chest', label: 'chest' }, { key: 'arms', label: 'arms' }, { key: 'thighs', label: 'thighs' }] as const

export function ProgressEntryOverlays(props: {
  readonly showWeight: boolean; readonly weight: string; readonly weightDate: string; readonly previousWeight?: number; readonly savingWeight: boolean; readonly onWeightChange: (value: string) => void; readonly onWeightDateChange: (value: string) => void; readonly onCloseWeight: () => void; readonly onSaveWeight: () => void
  readonly showMeasure: boolean; readonly measureForm: Readonly<Record<string, string>>; readonly measureDate: string; readonly savingMeasure: boolean; readonly onMeasureChange: (key: string, value: string) => void; readonly onMeasureDateChange: (value: string) => void; readonly onCloseMeasure: () => void; readonly onSaveMeasure: () => void; readonly t: ProgressTranslate
}) {
  const reactId = useId()
  const weightInputRef = useRef<HTMLInputElement>(null)
  const firstMeasureInputRef = useRef<HTMLInputElement>(null)
  const hasMeasure = Object.values(props.measureForm).some(Boolean)

  // The measure overlay was rendered last, and therefore visually on top, in the
  // historical invalid state where both flags were true. Preserve that priority
  // while mounting only one focus trap.
  const showWeight = props.showWeight && !props.showMeasure

  return <>
    {showWeight && (
      <RailOverlay>
        <DashboardMeasurementDialogShell
          title="ENREGISTRER MON POIDS"
          initialFocusRef={weightInputRef}
          onClose={props.onCloseWeight}
          overlayStyle={{ display: 'flex', alignItems: 'flex-end' }}
          panelStyle={{ background: colors.surface, padding: '28px 20px 48px', width: '100%' }}
          headerMarginBottom={24}
          headerVariant="progress"
        >
          <label htmlFor={`progress-weight-${reactId}`} style={visuallyHiddenStyle}>Poids en kilogrammes</label>
          <input
            ref={weightInputRef}
            id={`progress-weight-${reactId}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={props.weight}
            onChange={event => props.onWeightChange(event.target.value)}
            placeholder="0.0"
            style={{ width: '100%', background: colors.background, border: `2px solid ${props.weight ? colors.gold : colors.goldBorder}`, borderRadius: radii.card, padding: 22, color: colors.text, fontSize: '3.2rem', textAlign: 'center' }}
          />
          {props.previousWeight !== undefined && <p style={{ textAlign: 'center', ...bodyStyle }}>{props.t('tab.previous', { weight: props.previousWeight })}</p>}
          <DateField id={`progress-weight-date-${reactId}`} value={props.weightDate} onChange={props.onWeightDateChange} label={props.t('tab.date')} />
          <button type="button" onClick={props.onSaveWeight} disabled={!props.weight || props.savingWeight} style={{ width: '100%', padding: 17, background: props.weight ? colors.gold : colors.surfaceHigh }}>
            {props.savingWeight ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </DashboardMeasurementDialogShell>
      </RailOverlay>
    )}

    {props.showMeasure && (
      <RailOverlay>
        <DashboardMeasurementDialogShell
          title={props.t('tab.myMeasurements')}
          initialFocusRef={firstMeasureInputRef}
          onClose={props.onCloseMeasure}
          overlayStyle={{ overflowY: 'auto' }}
          panelStyle={{ background: colors.surface, padding: '28px 20px 48px', marginTop: 60 }}
          headerMarginBottom={24}
          headerVariant="progress"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FIELDS.map((field, index) => {
              const inputId = `progress-measure-${field.key}-${reactId}`
              return (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', background: colors.background, padding: '0 16px' }}>
                  <label htmlFor={inputId} style={{ ...bodyStyle, flex: 1 }}>{props.t(`tab.measureLabels.${field.label}`)}</label>
                  <input
                    ref={index === 0 ? firstMeasureInputRef : undefined}
                    id={inputId}
                    type="number"
                    value={props.measureForm[field.key]}
                    onChange={event => props.onMeasureChange(field.key, event.target.value)}
                    style={{ background: 'transparent', color: colors.text, width: 72, border: 'none', padding: 14 }}
                  />
                  <span style={{ ...mutedStyle }}>cm</span>
                </div>
              )
            })}
          </div>
          <DateField id={`progress-measure-date-${reactId}`} value={props.measureDate} onChange={props.onMeasureDateChange} label={props.t('tab.date')} />
          <button type="button" onClick={props.onSaveMeasure} disabled={!hasMeasure || props.savingMeasure} style={{ width: '100%', padding: 17, background: hasMeasure ? colors.gold : colors.surfaceHigh }}>
            {props.savingMeasure ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </DashboardMeasurementDialogShell>
      </RailOverlay>
    )}
  </>
}

function DateField({ id, value, onChange, label }: { readonly id: string; readonly value: string; readonly onChange: (value: string) => void; readonly label: string }) {
  return <div style={{ margin: '20px 0' }}><label htmlFor={id} style={subtitleStyle}>{label}</label><input id={id} type="date" value={value} onChange={event => onChange(event.target.value)} style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card, padding: 14, color: colors.text, fontFamily: fonts.body }} /></div>
}

const visuallyHiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const
