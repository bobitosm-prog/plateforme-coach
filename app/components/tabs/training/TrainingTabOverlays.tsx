'use client'

import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
import ExerciseSearchModal from '../../modals/ExerciseSearchModal'
import ExerciseDetailModal from '../../modals/ExerciseDetailModal'
import VideoFeedbackModal from '../../VideoFeedbackModal'
import VideoFeedbackHistory from '../../VideoFeedbackHistory'
import ProgramBuilder from '../../training/ProgramBuilder'
import ExerciseInfoPopup from '../../ExerciseInfoPopup'
import AddExercisePopup from './AddExercisePopup'
import SaveChoicePopup from './SaveChoicePopup'
import { TechniqueTooltip } from './TechniquePopup'
import StartProgramModal from './StartProgramModal'
import { downloadBlankTemplate, exportProgramToXlsx, parseProgramFromXlsx } from '../../../../lib/program-excel'
import TrainingVariantModal from './modals/TrainingVariantModal'
import TrainingWorkoutHistoryModal from './modals/TrainingWorkoutHistoryModal'
import TrainingImportPreviewModal from './modals/TrainingImportPreviewModal'
import TrainingProgramManagerModal, { type ManagedTrainingProgram } from './modals/TrainingProgramManagerModal'
import type { LegacyTrainingExercise } from './training-tab-types'


import type { TrainingTabRuntime } from '../TrainingTabView'

export default function TrainingTabOverlays({ runtime }: { runtime: TrainingTabRuntime }) {
  const {
    t, locale, supabase, session, aiAllowed, showProgramManager, setShowProgramManager,
    customPrograms, expandedProgram, confirmDelete, importFileRef, setExpandedProgram, setConfirmDelete, setEditingProgram,
    setShowProgramBuilder, setImportPreview, setImportName, setImportSkipped, activateProgram, deactivateProgram, deleteProgram,
    importPreview, importName, importSkipped, setStartModalImportData, setStartModalProgram, showExDbModal, setShowExDbModal,
    exerciseDetail, setExerciseDetail, videoExercise, setVideoExercise, showProgramBuilder, editingProgram, refreshPrograms,
    showAddExercise, exerciseSearchQ, setExerciseSearchQ, exerciseSearchResults, editMode, editedDays, trainingDay,
    editAddEx, addExerciseToSession, setShowAddExercise, showSaveChoice, saveWithModifications, saveOriginal, setShowSaveChoice,
    exerciseInfo, setExerciseInfo, techniqueTooltip, setTechniqueTooltip, startModalProgram, handleStartProgram, variantPopup,
    setVariantPopup, selectEditVariant, selectedWorkout, workoutDetail, loadingDetail, setSelectedWorkout,
  } = runtime

  return <>
    {/* ═══ SECTION 7 — PROGRAM MANAGER MODAL (fullscreen) ═══ */}
    {showProgramManager && (
      <TrainingProgramManagerModal
        programs={customPrograms as ManagedTrainingProgram[]}
        expandedProgramId={expandedProgram}
        confirmDeleteId={confirmDelete}
        locale={locale}
        importFileRef={importFileRef}
        labels={{
          title: t('programs.title'), create: 'CRÉER', importXlsx: t('calendar.buttons.importXlsx'),
          noPrograms: t('programs.noPrograms'), days: (count: number) => t('calendar.import.days', { count }),
          ai: t('calendar.import.ai'), importSource: t('calendar.import.importSource'), manual: t('calendar.import.manual'),
          activate: t('calendar.buttons.activate'), deactivate: t('calendar.buttons.deactivate'),
          day: (index: number) => t('calendar.day', { num: index }), rest: t('calendar.rest'),
          session: (index: number) => t('calendar.session', { num: index }), exercise: (index: number) => t('calendar.exerciseNum', { num: index }),
          noExercises: t('programs.noExercises'), confirmDelete: t('calendar.buttons.confirmDelete'),
          cancel: t('calendar.buttons.cancel'), deleteProgram: t('programs.deleteProgram'),
        }}
        onClose={() => { setShowProgramManager(false); setExpandedProgram(null); setConfirmDelete(null) }}
        onCreate={() => { setEditingProgram(null); setShowProgramBuilder(true); setShowProgramManager(false) }}
        onImportFile={async (event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          if (!file) return
          const result = await parseProgramFromXlsx(file)
          if (!result.success) { toast.error(result.error || t('calendar.toasts.error')); return }
          if (result.program) {
            setImportPreview(result.program)
            setImportName(result.program.name)
            setImportSkipped(result.skippedSheets || [])
          }
          event.target.value = ''
        }}
        onToggleExpanded={setExpandedProgram}
        onActivate={activateProgram}
        onDeactivate={deactivateProgram}
        onEdit={(program: ManagedTrainingProgram) => { setEditingProgram(program); setShowProgramBuilder(true); setShowProgramManager(false) }}
        onExport={(program: ManagedTrainingProgram) => exportProgramToXlsx(program as Parameters<typeof exportProgramToXlsx>[0])}
        onRequestDelete={setConfirmDelete}
        onDelete={(programId: string) => { deleteProgram(programId); setConfirmDelete(null); setExpandedProgram(null) }}
        onDownloadTemplate={downloadBlankTemplate}
      />
    )}

    {/* ═══ IMPORT PREVIEW MODAL ═══ */}
    {importPreview && (
      <TrainingImportPreviewModal
        preview={importPreview}
        name={importName}
        skipped={importSkipped}
        labels={{
          programName: t('programs.programName'), importAction: t('calendar.buttons.import'),
          cancel: t('calendar.buttons.cancel'), skipped: t('calendar.import.skipped'),
          weekLabel: (start: number, end: number) => t('calendar.weekLabel', { start, end }),
          result: (imported: number, total: number, skipped: number) => t('calendar.import.result', { imported, total, skipped }),
        }}
        onNameChange={setImportName}
        onClose={() => setImportPreview(null)}
        onConfirm={() => {
          const insertData: Record<string, unknown> = {
            name: importName.trim() || 'Programme importé',
            description: importPreview.description || '',
            days: importPreview.days,
            source: 'import',
          }
          if (importPreview.total_weeks) {
            insertData.total_weeks = importPreview.total_weeks
            insertData.current_week = importPreview.current_week || 1
            insertData.phases = importPreview.phases || null
          }
          setStartModalImportData(insertData)
          setStartModalProgram({ name: importName.trim() || 'Programme importé' })
          setImportPreview(null)
        }}
      />
    )}

    {/* ═══ ALL EXISTING MODALS (unchanged) ═══ */}

    {/* Exercise DB Modal */}
    {showExDbModal && (
      <ExerciseSearchModal
        supabase={supabase}
        onClose={() => setShowExDbModal(false)}
        onAdd={(ex: LegacyTrainingExercise) => addExerciseToSession(ex)}
      />
    )}

    {/* Exercise Detail Modal */}
    {exerciseDetail && (
      <ExerciseDetailModal
        exercise={exerciseDetail}
        sets={exerciseDetail._sets}
        reps={exerciseDetail._reps}
        rest={exerciseDetail._rest}
        onClose={() => setExerciseDetail(null)}
        onAdd={(ex: LegacyTrainingExercise) => { addExerciseToSession(ex); setExerciseDetail(null) }}
      />
    )}

    {/* Video Feedback Modal */}
    {videoExercise && session?.user?.id && (
      <VideoFeedbackModal
        exerciseName={videoExercise}
        userId={session.user.id}
        onClose={() => setVideoExercise(null)}
      />
    )}

    {/* Video Feedback History */}
    {session?.user?.id && (
      <VideoFeedbackHistory userId={session.user.id} />
    )}

    {showProgramBuilder && (
      <ProgramBuilder
        supabase={supabase}
        session={session}
        aiAllowed={aiAllowed}
        onClose={() => { setShowProgramBuilder(false); setEditingProgram(null) }}
        onSave={refreshPrograms}
        editProgram={editingProgram}
      />
    )}

    {showAddExercise && (
      <AddExercisePopup searchQ={exerciseSearchQ} onSearchChange={setExerciseSearchQ} results={exerciseSearchResults} onSelect={(ex: LegacyTrainingExercise) => {
        if (editMode && editedDays) {
          const dayIdx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
          editAddEx(dayIdx, ex)
        } else {
          addExerciseToSession(ex)
        }
        setShowAddExercise(false)
      }} onClose={() => setShowAddExercise(false)} />
    )}
    {showSaveChoice && (
      <SaveChoicePopup onSaveModified={async () => { await saveWithModifications(); setShowSaveChoice(false) }} onSaveOriginal={async () => { await saveOriginal(); setShowSaveChoice(false) }} onClose={() => setShowSaveChoice(false)} />
    )}

    {/* Exercise info popup */}
    {exerciseInfo && <ExerciseInfoPopup info={exerciseInfo} onClose={() => setExerciseInfo(null)} />}

    {/* Technique tooltip */}
    {techniqueTooltip && <TechniqueTooltip technique={techniqueTooltip} onClose={() => setTechniqueTooltip(null)} />}

    {/* Start program modal */}
    {startModalProgram && (
      <StartProgramModal
        programName={startModalProgram.name}
        onStart={handleStartProgram}
        onClose={() => { setStartModalProgram(null); setStartModalImportData(null) }}
      />
    )}

    {/* Variant popup */}
    {variantPopup && (
      <TrainingVariantModal
        variants={variantPopup.variants}
        closeLabel={t('calendar.closeVariants')}
        emptyLabel={t('programs.noVariants')}
        onClose={() => setVariantPopup(null)}
        onSelect={selectEditVariant}
      />
    )}

    {/* Workout detail popup */}
    {selectedWorkout && (
      <TrainingWorkoutHistoryModal
        workout={selectedWorkout}
        detail={workoutDetail}
        loading={loadingDetail}
        locale={locale}
        fallbackTitle={t('calendar.exercise')}
        onClose={() => setSelectedWorkout(null)}
      />
    )}

  </>
}
