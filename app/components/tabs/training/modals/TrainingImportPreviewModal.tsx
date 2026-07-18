'use client'

import { colors, fonts, bodyStyle, mutedStyle, labelStyle, btnPrimary, btnSecondary } from '@/lib/design-tokens'
import type { ImportResult } from '@/lib/program-excel'
import { RailOverlay } from '@/app/components/ui/RailOverlay'
import ModalHeader from '@/app/components/ui/ModalHeader'

interface TrainingImportPreviewModalProps {
  preview: NonNullable<ImportResult['program']>
  name: string
  skipped: readonly string[]
  labels: {
    programName: string
    importAction: string
    cancel: string
    skipped: string
    weekLabel: (start: number, end: number) => string
    result: (imported: number, total: number, skipped: number) => string
  }
  onNameChange: (name: string) => void
  onConfirm: () => void
  onClose: () => void
}

export default function TrainingImportPreviewModal({ preview, name, skipped, labels, onNameChange, onConfirm, onClose }: TrainingImportPreviewModalProps) {
  return (
    <RailOverlay>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
        <div onClick={event => event.stopPropagation()} style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ModalHeader title="APERÇU IMPORT" badge={preview.total_weeks ? `${preview.total_weeks} SEM` : undefined} onClose={onClose} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>
            <div style={{ marginTop: 16 }}>
              <div style={{ ...labelStyle, marginBottom: 4 }}>{labels.programName}</div>
              <input value={name} onChange={event => onNameChange(event.target.value)} style={{ width: '100%', padding: 12, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 8, color: colors.text, fontFamily: fonts.body, fontSize: 14, outline: 'none' }} />
            </div>

            {preview.phases && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {preview.phases.map((phase, index) => (
                  <div key={index} style={{ padding: '6px 10px', background: colors.goldDim, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: fonts.headline, fontSize: 11, color: colors.gold }}>{phase.name}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>{labels.weekLabel(phase.weeks[0], phase.weeks[1])}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
              {preview.days.map((day, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: `1px solid ${colors.goldBorder}` }}>
                  <span style={{ ...bodyStyle, fontSize: 13 }}>
                    {day.is_rest ? `Jour ${index + 1} — Repos` : `Jour ${index + 1} — ${day.name}`}
                  </span>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>{day.is_rest ? '🌙' : `${(day.exercises || []).length} ex. ✓`}</span>
                </div>
              ))}
              {skipped.map((skippedName, index) => (
                <div key={`skip-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', opacity: 0.6 }}>
                  <span style={{ ...bodyStyle, fontSize: 13 }}>{skippedName}</span>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>{labels.skipped}</span>
                </div>
              ))}
              {skipped.length > 0 && (
                <div style={{ ...mutedStyle, fontSize: 11, marginTop: 4 }}>
                  {labels.result(preview.days.length, preview.days.length + skipped.length, skipped.length)}
                </div>
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0, padding: '16px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: `0.5px solid ${colors.goldBorder}`, background: colors.background, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onConfirm} style={{ ...btnPrimary, padding: 14 }}>{labels.importAction}</button>
            <button onClick={onClose} style={{ ...btnSecondary, padding: 14 }}>{labels.cancel}</button>
          </div>
        </div>
      </div>
    </RailOverlay>
  )
}
