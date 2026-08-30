'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { ChevronDown, Download, Dumbbell, FileDown, FileUp, Moon, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { UserCapabilities } from '../../../lib/entitlements/capabilities'
import type { ActiveTrainingProgramContext } from '../../../lib/training/active-program'
import { resolveTrainingProgramAccess } from '../../../lib/training/training-program-access'
import { buildWeekSessions, padTo7Days, toDateStr } from '../../../lib/schedule-utils'
import { downloadBlankTemplate, exportProgramToXlsx, parseProgramFromXlsx, type ImportResult, type ProgramData } from '../../../lib/program-excel'
import { useAiQuota } from '../../hooks/useAiQuota'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { AiQuotaBadgeView, resolveAiQuotaBadgeState } from '../ui/AiQuotaBadge'
import { RailOverlay } from '../ui/RailOverlay'
import StartProgramModal from '../tabs/training/StartProgramModal'
import styles from './TrainingProgramManager.module.css'

const ProgramBuilder = dynamic(() => import('./ProgramBuilder'), {
  ssr: false,
  loading: () => <div className={styles.builderLoading} role="status" aria-live="polite" />,
})

type ProgramDay = ProgramData['days'][number]

type ProgramRecord = ProgramData & {
  id: string
  name: string
  days: ProgramDay[]
  is_active?: boolean
  scheduled?: boolean
  start_date?: string | null
  source?: string
  total_weeks?: number
  [key: string]: unknown
}

interface TrainingProgramManagerProps {
  supabase: SupabaseClient
  session: Session | null
  profile?: unknown
  capabilities: UserCapabilities
  activeProgramContext: ActiveTrainingProgramContext
  onRefresh: (forceRefresh?: boolean) => Promise<void>
  onClose: () => void
  embedded?: boolean
}

async function fetchPrograms(supabase: SupabaseClient, userId: string): Promise<{ programs: ProgramRecord[]; failed: boolean }> {
  if (!userId) return { programs: [], failed: true }
  const { data, error } = await supabase.from('custom_programs').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  return { programs: (data || []) as ProgramRecord[], failed: Boolean(error) }
}

export default function TrainingProgramManager({
  supabase,
  session,
  profile,
  capabilities,
  activeProgramContext,
  onRefresh,
  onClose,
  embedded = false,
}: TrainingProgramManagerProps) {
  const t = useTranslations('accountPrograms.training.management')
  const locale = useLocale()
  const access = resolveTrainingProgramAccess({ capabilities, activeProgramContext })
  const quota = useAiQuota()
  const quotaState = resolveAiQuotaBadgeState(quota)
  const canGenerate = access.canGenerateLater && quotaState === 'available'
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [startProgram, setStartProgram] = useState<ProgramRecord | null>(null)
  const [pendingImport, setPendingImport] = useState<NonNullable<ImportResult['program']> | null>(null)
  const [importPreview, setImportPreview] = useState<ImportResult['program'] | null>(null)
  const [importSkipped, setImportSkipped] = useState<string[]>([])
  const [importName, setImportName] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const managerRef = useRef<HTMLElement>(null)
  const managerCloseRef = useRef<HTMLButtonElement>(null)
  const importDialogRef = useRef<HTMLDivElement>(null)
  const importNameRef = useRef<HTMLInputElement>(null)

  useFocusTrap({
    active: !embedded && !builderOpen && !importPreview && !startProgram,
    containerRef: managerRef,
    initialFocusRef: managerCloseRef,
    onEscape: onClose,
  })
  useFocusTrap({
    active: Boolean(importPreview),
    containerRef: importDialogRef,
    initialFocusRef: importNameRef,
    onEscape: () => setImportPreview(null),
  })

  function mutationBlocked() {
    if (access.canConfigure) return false
    toast.error(t(access.reason === 'relation_uncertain' ? 'relationBlocked' : access.reason === 'coach_plan_protected' ? 'coachBlocked' : 'mutationBlocked'))
    return true
  }

  const userId = session?.user.id || ''

  async function loadPrograms() {
    setListState('loading')
    const result = await fetchPrograms(supabase, userId)
    if (result.failed) {
      setListState('error')
      return
    }
    setPrograms(result.programs)
    setListState(result.programs.length > 0 ? 'ready' : 'empty')
  }

  useEffect(() => {
    let active = true
    void fetchPrograms(supabase, userId).then(result => {
      if (!active) return
      if (result.failed) setListState('error')
      else {
        setPrograms(result.programs)
        setListState(result.programs.length > 0 ? 'ready' : 'empty')
      }
    })
    return () => { active = false }
  }, [supabase, userId])

  async function refreshAuthorities() {
    await loadPrograms()
    await onRefresh(true)
  }

  async function syncActiveSchedule(program: ProgramRecord): Promise<boolean> {
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mondayStr = toDateStr(monday)
    const sundayStr = toDateStr(sunday)

    const { error: deleteError } = await supabase.from('scheduled_sessions').delete()
      .eq('user_id', userId)
      .gte('scheduled_date', mondayStr)
      .lte('scheduled_date', sundayStr)
      .eq('completed', false)
    if (deleteError) return false

    const { data: remaining, error: readError } = await supabase.from('scheduled_sessions')
      .select('scheduled_date, session_type')
      .eq('user_id', userId)
      .gte('scheduled_date', mondayStr)
      .lte('scheduled_date', sundayStr)
    if (readError) return false

    const remainingRows = (remaining || []) as Array<{ scheduled_date: string; session_type: string }>
    const remainingKeys = new Set(remainingRows.map(item => `${item.scheduled_date}|${item.session_type}`))
    const scheduleProfile = typeof profile === 'object' && profile !== null ? profile as Parameters<typeof buildWeekSessions>[2] : {}
    const sessions = buildWeekSessions(userId, monday, scheduleProfile, program)
      .filter(item => !remainingKeys.has(`${item.scheduled_date}|${item.session_type}`))
    if (sessions.length === 0) return true
    const { error: insertError } = await supabase.from('scheduled_sessions').insert(sessions)
    return !insertError
  }

  async function activateProgram(programId: string, override?: ProgramRecord): Promise<boolean> {
    if (mutationBlocked()) return false
    setBusyAction(`activate:${programId}`)
    const previousActive = programs.filter(program => program.is_active && program.id !== programId)
    const { error: disableError } = await supabase.from('custom_programs')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', programId)
    if (disableError) {
      toast.error(t('activationError'))
      setBusyAction(null)
      return false
    }

    const selected = override || programs.find(program => program.id === programId)
    const startDate = selected?.start_date || toDateStr(new Date())
    const { error: activateError } = await supabase.from('custom_programs')
      .update({ is_active: true, scheduled: false, start_date: startDate })
      .eq('id', programId)
      .eq('user_id', userId)
    if (activateError) {
      if (previousActive.length === 1) {
        await supabase.from('custom_programs').update({ is_active: true }).eq('id', previousActive[0].id).eq('user_id', userId)
      }
      toast.error(t('activationError'))
      await refreshAuthorities()
      setBusyAction(null)
      return false
    }

    const scheduleOk = selected ? await syncActiveSchedule(selected) : false
    await refreshAuthorities()
    setBusyAction(null)
    if (!scheduleOk) {
      toast.error(t('scheduleSyncError'))
      return false
    }
    toast.success(t('activated'))
    return true
  }

  async function deactivateProgram(programId: string) {
    if (mutationBlocked()) return
    setBusyAction(`deactivate:${programId}`)
    const { error } = await supabase.from('custom_programs').update({ is_active: false }).eq('id', programId).eq('user_id', userId)
    if (error) toast.error(t('persistenceError'))
    else {
      await refreshAuthorities()
      toast.success(t('deactivated'))
    }
    setBusyAction(null)
  }

  async function scheduleProgram(programId: string, startDate: string): Promise<boolean> {
    if (mutationBlocked()) return false
    setBusyAction(`schedule:${programId}`)
    const { error } = await supabase.from('custom_programs')
      .update({ scheduled: true, start_date: startDate, current_week: 1 })
      .eq('id', programId)
      .eq('user_id', userId)
    if (error) {
      toast.error(t('scheduleError'))
      setBusyAction(null)
      return false
    }
    await refreshAuthorities()
    setBusyAction(null)
    toast.success(t('scheduled', { date: new Date(`${startDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }))
    return true
  }

  async function deleteProgram(programId: string) {
    if (mutationBlocked()) return
    setBusyAction(`delete:${programId}`)
    const { error } = await supabase.from('custom_programs').delete().eq('id', programId).eq('user_id', userId)
    if (error) toast.error(t('deleteError'))
    else {
      setExpandedId(null)
      setConfirmDeleteId(null)
      await refreshAuthorities()
      toast.success(t('deleted'))
    }
    setBusyAction(null)
  }

  async function handleStart(option: 'now' | 'monday' | 'custom', date?: string) {
    const selected = startProgram
    const importData = pendingImport
    setStartProgram(null)
    setPendingImport(null)
    if (!selected || mutationBlocked()) return

    if (importData) {
      setBusyAction('import')
      const { data, error } = await supabase.from('custom_programs')
        .insert({ ...importData, user_id: userId, is_active: false, scheduled: false })
        .select()
        .single()
      setBusyAction(null)
      if (error || !data) {
        toast.error(t('importError'))
        return
      }
      if (option === 'now') await activateProgram(data.id, data as ProgramRecord)
      else if (date) await scheduleProgram(data.id, date)
      else await refreshAuthorities()
      return
    }

    if (option === 'now') await activateProgram(selected.id)
    else if (date) await scheduleProgram(selected.id, date)
  }

  async function handleImportFile(file: File) {
    if (mutationBlocked()) return
    const result = await parseProgramFromXlsx(file)
    if (!result.success || !result.program) {
      toast.error(t('importValidationError'))
      return
    }
    setImportPreview(result.program)
    setImportName(result.program.name)
    setImportSkipped(result.skippedSheets || [])
  }

  function openBuilder(program: ProgramRecord | null) {
    if (mutationBlocked()) return
    setEditingProgram(program)
    setBuilderOpen(true)
  }

  const manager = (
    <section ref={managerRef} className={embedded ? styles.embedded : styles.overlay} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby="training-manager-title">
      <header className={styles.header}>
        <div>
          <span>{t('eyebrow')}</span>
          <h2 id="training-manager-title">{t('title')}</h2>
        </div>
        <button ref={managerCloseRef} type="button" onClick={onClose} aria-label={t('close')}><X size={20} /></button>
      </header>

      <AiQuotaBadgeView {...quota} />
      {access.reason === 'coach_plan_protected' && <p className={styles.blocked} role="status">{t('coachBlocked')}</p>}
      {access.reason === 'relation_uncertain' && <p className={styles.blocked} role="status">{t('relationBlocked')}</p>}

      <input ref={importRef} className={styles.hiddenInput} type="file" accept=".xlsx,.xls" onChange={event => {
        const file = event.target.files?.[0]
        if (file) void handleImportFile(file)
        event.target.value = ''
      }} />

      <div className={styles.primaryActions}>
        <button type="button" onClick={() => openBuilder(null)} disabled={!access.canConfigure}><Plus size={18} />{t('create')}</button>
        <button type="button" onClick={() => importRef.current?.click()} disabled={!access.canConfigure}><FileUp size={18} />{t('import')}</button>
        <button type="button" onClick={downloadBlankTemplate}><FileDown size={18} />{t('template')}</button>
      </div>

      {listState === 'loading' && <div className={styles.listLoading} role="status" aria-live="polite">{t('loading')}</div>}
      {listState === 'error' && <div className={styles.listError} role="alert">{t('listError')}</div>}
      {listState === 'empty' && <div className={styles.empty}><Dumbbell size={32} /><p>{t('empty')}</p></div>}
      {listState === 'ready' && (
        <div className={styles.list}>
          {programs.map(program => {
            const expanded = expandedId === program.id
            const actionBusy = busyAction?.endsWith(program.id) || busyAction === 'import'
            const sourceLabel = program.source === 'ai' ? t('sourceAi') : program.source === 'import' ? t('sourceImport') : t('sourceManual')
            return (
              <article key={program.id} className={styles.programCard}>
                <button type="button" className={styles.programHeader} onClick={() => setExpandedId(expanded ? null : program.id)} aria-expanded={expanded}>
                  <span><strong>{program.name}</strong><small>{t('programMeta', { count: program.days?.length || 0, source: sourceLabel })}</small></span>
                  <span className={styles.status}>{program.is_active ? t('active') : program.scheduled ? t('scheduledBadge') : t('inactive')}<ChevronDown size={16} /></span>
                </button>
                {expanded && (
                  <div className={styles.programBody}>
                    <div className={styles.programActions}>
                      {program.is_active
                        ? <button type="button" disabled={!access.canConfigure || actionBusy} onClick={() => void deactivateProgram(program.id)}>{t('deactivate')}</button>
                        : <button type="button" disabled={!access.canConfigure || actionBusy} onClick={() => setStartProgram(program)}>{t('activateOrSchedule')}</button>}
                      <button type="button" disabled={!access.canConfigure || actionBusy} onClick={() => openBuilder(program)}><Pencil size={15} />{t('edit')}</button>
                      <button type="button" onClick={() => exportProgramToXlsx(program)}><Download size={15} />{t('export')}</button>
                    </div>
                    <div className={styles.days}>
                      {padTo7Days(program.days || []).map((day: ProgramDay, index: number) => (
                        <div key={index}><strong>{day.is_rest ? t('restDay', { count: index + 1 }) : day.name || t('trainingDay', { count: index + 1 })}</strong>{day.is_rest ? <Moon size={14} /> : <span>{t('exerciseCount', { count: day.exercises?.length || 0 })}</span>}</div>
                      ))}
                    </div>
                    {confirmDeleteId === program.id ? (
                      <div className={styles.deleteConfirm}>
                        <button type="button" disabled={actionBusy} onClick={() => void deleteProgram(program.id)}><Trash2 size={15} />{t('confirmDelete')}</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)}>{t('cancel')}</button>
                      </div>
                    ) : (
                      <button type="button" className={styles.deleteButton} disabled={!access.canConfigure || actionBusy} onClick={() => setConfirmDeleteId(program.id)}><Trash2 size={15} />{t('delete')}</button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {quotaState === 'loading' && <span className={styles.srOnly}>{t('quotaLoading')}</span>}
      {builderOpen && (
        <ProgramBuilder
          supabase={supabase}
          session={session}
          canMutate={access.canConfigure}
          aiAllowed={canGenerate}
          onAiQuotaChange={quota.refresh}
          editProgram={editingProgram}
          onSave={() => { quota.refresh(); void refreshAuthorities() }}
          onClose={() => { setBuilderOpen(false); setEditingProgram(null) }}
        />
      )}

      {importPreview && (
        <div className={styles.importBackdrop} onClick={() => setImportPreview(null)}>
          <div ref={importDialogRef} className={styles.importDialog} role="dialog" aria-modal="true" aria-labelledby="import-preview-title" onClick={event => event.stopPropagation()}>
            <h3 id="import-preview-title">{t('importPreview')}</h3>
            <label>{t('programName')}<input ref={importNameRef} value={importName} onChange={event => setImportName(event.target.value)} /></label>
            <p>{t('importDays', { count: importPreview.days.length })}</p>
            {importSkipped.length > 0 && <p>{t('importSkipped', { count: importSkipped.length })}</p>}
            <div className={styles.dialogActions}>
              <button type="button" onClick={() => {
                const data = { ...importPreview, name: importName.trim() || t('importedName'), source: 'import' }
                setPendingImport(data)
                setStartProgram({ id: 'pending-import', name: data.name, days: data.days })
                setImportPreview(null)
              }}>{t('continue')}</button>
              <button type="button" onClick={() => setImportPreview(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {startProgram && <StartProgramModal programName={startProgram.name} onStart={handleStart} onClose={() => { setStartProgram(null); setPendingImport(null) }} />}
    </section>
  )

  return embedded ? manager : <RailOverlay>{manager}</RailOverlay>
}
