import React, { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../app/components/ui/RailOverlay', () => ({ RailOverlay: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../app/components/ui/ModalHeader', () => ({ default: ({ title }: { title: string }) => h('header', null, title) }))
vi.mock('../../app/components/training/WorkoutDetailList', () => ({ default: ({ loading }: { loading: boolean }) => h('div', null, loading ? 'DETAIL_LOADING' : 'DETAIL_READY') }))
vi.mock('../../app/components/ui/AiQuotaBadge', () => ({ default: () => h('div', null, 'AI_QUOTA') }))

import TrainingTimerAlertModal from '../../app/components/tabs/training/modals/TrainingTimerAlertModal'
import TrainingVariantModal from '../../app/components/tabs/training/modals/TrainingVariantModal'
import TrainingWorkoutHistoryModal from '../../app/components/tabs/training/modals/TrainingWorkoutHistoryModal'
import TrainingImportPreviewModal from '../../app/components/tabs/training/modals/TrainingImportPreviewModal'
import TrainingProgramManagerModal from '../../app/components/tabs/training/modals/TrainingProgramManagerModal'

const noop = vi.fn()

describe('TrainingTab extracted modal views', () => {
  beforeEach(() => noop.mockClear())

  it('renders timer content and its close action contract', () => {
    const html = renderToStaticMarkup(h(TrainingTimerAlertModal, {
      message: 'Continue', restDoneLabel: 'Repos terminé', onClose: noop,
    }))
    expect(html).toContain('Repos terminé')
    expect(html).toContain('Continue')
    expect(html).toContain('C&#x27;EST PARTI')
  })

  it('renders variant selection and supports an empty optional collection', () => {
    const populated = renderToStaticMarkup(h(TrainingVariantModal, {
      variants: [{ name: 'Goblet squat', equipment: 'Haltères', muscle_group: 'Jambes' }],
      closeLabel: 'Fermer', emptyLabel: 'Aucune variante', onClose: noop, onSelect: noop,
    }))
    expect(populated).toContain('Goblet squat')
    expect(populated).toContain('Haltères · Jambes')
    expect(populated).toContain('max-height:60vh')

    const empty = renderToStaticMarkup(h(TrainingVariantModal, {
      variants: [], closeLabel: 'Fermer', emptyLabel: 'Aucune variante', onClose: noop, onSelect: noop,
    }))
    expect(empty).toContain('Aucune variante')
  })

  it('renders workout detail with legacy metadata and loading state', () => {
    const html = renderToStaticMarkup(h(TrainingWorkoutHistoryModal, {
      workout: { id: 'session-1', name: null, created_at: '2026-07-18T12:00:00Z', duration_minutes: 45 },
      detail: [], loading: true, locale: 'fr', fallbackTitle: 'Exercice', onClose: noop,
    }))
    expect(html).toContain('Exercice')
    expect(html).toContain('45 min')
    expect(html).toContain('DETAIL_LOADING')
    expect(html).toContain('overflow-y:auto')
  })

  it('renders import preview data, skipped sheets and fixed mobile footer', () => {
    const html = renderToStaticMarkup(h(TrainingImportPreviewModal, {
      preview: {
        name: 'Import', description: '', source: 'import', days: [{ name: 'Push', exercises: [{ name: 'Pompes' }] }],
        total_weeks: 4, current_week: 1,
      },
      name: 'Import', skipped: ['Feuille inconnue'],
      labels: {
        programName: 'Nom', importAction: 'Importer', cancel: 'Annuler', skipped: 'Ignorée',
        weekLabel: (start: number, end: number) => `${start}-${end}`,
        result: (imported: number, total: number, skipped: number) => `${imported}/${total}/${skipped}`,
      },
      onNameChange: noop, onConfirm: noop, onClose: noop,
    }))
    expect(html).toContain('APERÇU IMPORT')
    expect(html).toContain('Push')
    expect(html).toContain('Feuille inconnue')
    expect(html).toContain('env(safe-area-inset-bottom')
  })

  it('renders program manager context without requiring optional days', () => {
    const html = renderToStaticMarkup(h(TrainingProgramManagerModal, {
      programs: [{ id: 'program-1', name: 'Programme personnel', days: null }],
      expandedProgramId: 'program-1', confirmDeleteId: null, locale: 'fr',
      importFileRef: { current: null },
      labels: {
        title: 'Programmes', create: 'Créer', importXlsx: 'Importer', noPrograms: 'Aucun programme',
        days: (count: number) => `${count} jours`, ai: 'IA', importSource: 'Import', manual: 'Manuel',
        activate: 'Activer', deactivate: 'Désactiver', day: (index: number) => `Jour ${index}`,
        rest: 'Repos', session: (index: number) => `Séance ${index}`, exercise: (index: number) => `Exercice ${index}`,
        noExercises: 'Aucun exercice', confirmDelete: 'Confirmer', cancel: 'Annuler', deleteProgram: 'Supprimer',
      },
      onClose: noop, onCreate: noop, onImportFile: noop, onToggleExpanded: noop, onActivate: noop,
      onDeactivate: noop, onEdit: noop, onExport: noop, onRequestDelete: noop, onDelete: noop,
      onDownloadTemplate: noop,
    }))
    expect(html).toContain('Programmes')
    expect(html).toContain('Programme personnel')
    expect(html).toContain('0 jours')
    expect(html).toContain('overflow-y:auto')
  })
})
