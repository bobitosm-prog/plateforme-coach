'use client'

import type { ChangeEvent, RefObject } from 'react'
import { Dumbbell, Moon } from 'lucide-react'
import { colors, fonts, bodyStyle, mutedStyle, titleStyle, cardStyle, btnPrimary, btnSecondary } from '@/lib/design-tokens'
import { RailOverlay } from '@/app/components/ui/RailOverlay'
import ModalHeader from '@/app/components/ui/ModalHeader'
import AiQuotaBadge from '@/app/components/ui/AiQuotaBadge'
import { padTo7Days } from '@/app/components/training/ProgramBuilder'

interface ProgramExerciseView {
  exercise_name?: string | null
  custom_name?: string | null
  name?: string | null
  exerciseName?: string | null
  sets?: number | string | null
  reps?: number | string | null
}

interface ProgramDayView {
  name?: string | null
  weekday?: string | null
  focus?: string | null
  is_rest?: boolean | null
  exercises?: ProgramExerciseView[] | null
}

export interface ManagedTrainingProgram {
  id: string
  name: string
  source?: string
  is_active?: boolean | null
  scheduled?: boolean | null
  start_date?: string | null
  total_weeks?: number | null
  days?: ProgramDayView[] | null
  [key: string]: unknown
}

interface TrainingProgramManagerModalProps {
  programs: readonly ManagedTrainingProgram[]
  expandedProgramId: string | null
  confirmDeleteId: string | null
  locale: string
  importFileRef: RefObject<HTMLInputElement | null>
  labels: {
    title: string
    create: string
    importXlsx: string
    noPrograms: string
    days: (count: number) => string
    ai: string
    importSource: string
    manual: string
    activate: string
    deactivate: string
    day: (index: number) => string
    rest: string
    session: (index: number) => string
    exercise: (index: number) => string
    noExercises: string
    confirmDelete: string
    cancel: string
    deleteProgram: string
  }
  onClose: () => void
  onCreate: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  onToggleExpanded: (programId: string | null) => void
  onActivate: (programId: string) => void
  onDeactivate: (programId: string) => void
  onEdit: (program: ManagedTrainingProgram) => void
  onExport: (program: ManagedTrainingProgram) => void
  onRequestDelete: (programId: string | null) => void
  onDelete: (programId: string) => void
  onDownloadTemplate: () => void
}

export default function TrainingProgramManagerModal(props: TrainingProgramManagerModalProps) {
  const { programs, expandedProgramId, confirmDeleteId, locale, importFileRef, labels } = props
  return (
    <RailOverlay>
      <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ModalHeader title={labels.title} onClose={props.onClose} />
        <input ref={importFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={props.onImportFile} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px' }}>
          <AiQuotaBadge />
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={props.onCreate} style={{ ...btnPrimary, flex: 1, padding: 16 }}>+ {labels.create}</button>
            <button onClick={() => importFileRef.current?.click()} style={{ ...btnSecondary, flex: 1, padding: 16 }}>{labels.importXlsx}</button>
          </div>

          {programs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Dumbbell size={48} color={colors.textDim} strokeWidth={1.5} />
              <p style={{ ...bodyStyle, marginTop: 12 }}>{labels.noPrograms}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {programs.map(program => {
                const isExpanded = expandedProgramId === program.id
                const days = program.days || []
                return (
                  <div key={program.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: program.is_active ? 1 : 0.7 }}>
                    <button onClick={() => props.onToggleExpanded(isExpanded ? null : program.id)} style={{ width: '100%', padding: 20, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: program.is_active ? colors.gold : colors.text, letterSpacing: '0.05em' }}>{program.name}</div>
                        <div style={{ ...mutedStyle, marginTop: 4 }}>
                          {labels.days(days.length)} · {program.source === 'ai' ? labels.ai : program.source === 'import' ? labels.importSource : labels.manual}
                          {program.total_weeks ? ` · ${program.total_weeks} sem.` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {program.total_weeks && <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 8px', borderRadius: 999 }}>{program.total_weeks} SEM</span>}
                        {program.is_active ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: 999 }}>● Actif</span>
                        ) : program.scheduled && program.start_date ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999 }}>📅 {new Date(`${program.start_date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, background: colors.divider, padding: '3px 10px', borderRadius: 999 }}>○ Inactif</span>
                        )}
                        <span style={{ color: colors.textMuted, fontSize: 14, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${colors.goldBorder}` }}>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
                          {program.is_active ? (
                            <button onClick={() => props.onDeactivate(program.id)} style={{ flex: 1, padding: '10px 0', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 12, color: colors.success, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{labels.deactivate}</button>
                          ) : (
                            <button onClick={() => props.onActivate(program.id)} style={{ flex: 1, padding: '10px 0', background: colors.goldDim, border: `1px solid ${colors.gold}`, borderRadius: 12, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{labels.activate}</button>
                          )}
                          <button onClick={() => props.onEdit(program)} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✏️ ÉDITER</button>
                          <button onClick={() => props.onExport(program)} style={{ padding: '10px 14px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⬇️</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {padTo7Days(days).map((day: ProgramDayView, dayIndex: number) => {
                            const exercises = day.exercises || []
                            return (
                              <div key={dayIndex} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.is_rest ? 0 : 8 }}>
                                  <div style={{ ...titleStyle, fontSize: 12 }}>
                                    {labels.day(dayIndex + 1)} : {day.is_rest ? labels.rest : (day.name || day.weekday || labels.session(dayIndex + 1))}
                                    {!day.is_rest && day.focus && <span style={{ color: colors.textMuted, fontWeight: 400, marginLeft: 6 }}>({day.focus})</span>}
                                  </div>
                                  {day.is_rest ? <Moon size={14} color={colors.textDim} /> : <span style={{ ...mutedStyle, fontSize: 10 }}>{exercises.length} ex.</span>}
                                </div>
                                {!day.is_rest && exercises.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {exercises.map((exercise, exerciseIndex) => (
                                      <div key={exerciseIndex} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: colors.gold, fontSize: 10 }}>•</span>
                                        <span style={{ ...bodyStyle, fontSize: 13, flex: 1, minWidth: 0 }}>{exercise.exercise_name || exercise.custom_name || exercise.name || exercise.exerciseName || labels.exercise(exerciseIndex + 1)}</span>
                                        <span style={{ ...mutedStyle, fontSize: 11, flexShrink: 0 }}>{exercise.sets || 3}×{exercise.reps || 10}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!day.is_rest && exercises.length === 0 && <span style={{ ...mutedStyle, fontSize: 12 }}>{labels.noExercises}</span>}
                              </div>
                            )
                          })}
                        </div>

                        <div style={{ marginTop: 16, borderTop: `1px solid ${colors.goldBorder}`, paddingTop: 16 }}>
                          {confirmDeleteId === program.id ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => props.onDelete(program.id)} style={{ flex: 1, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{labels.confirmDelete}</button>
                              <button onClick={() => props.onRequestDelete(null)} style={{ padding: '12px 20px', background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{labels.cancel}</button>
                            </div>
                          ) : (
                            <button onClick={() => props.onRequestDelete(program.id)} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: colors.error, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{labels.deleteProgram}</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={props.onDownloadTemplate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textDecoration: 'underline', padding: 8 }}>Télécharger le modèle vierge (.xlsx)</button>
          </div>
        </div>
      </div>
    </RailOverlay>
  )
}
