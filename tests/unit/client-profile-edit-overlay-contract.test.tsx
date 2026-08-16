import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../app/client/[id]/hooks/useClientDetail', () => ({
  DAYS: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
}))

import ClientDetailPageOverlays from '../../app/client/[id]/components/page/ClientDetailPageOverlays'
import type { ClientDetailState } from '../../app/client/[id]/components/page/client-detail-page-types'

function createDetail(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      full_name: 'Client Test',
      email: 'client@example.invalid',
      objective: 'maintien',
      target_weight: 70,
    },
    editOpen: true,
    editTab: 'info',
    editName: 'Client Test',
    editEmail: 'client@example.invalid',
    editPhone: '+33 6 00 00 00 00',
    editBirth: '1990-01-01',
    editGender: 'homme',
    editWeight: '75',
    editHeight: '180',
    editTargetW: '70',
    editBodyFat: '18',
    editStatus: 'active',
    editObj: 'maintien',
    setEditOpen: vi.fn(),
    setEditTab: vi.fn(),
    setEditName: vi.fn(),
    setEditEmail: vi.fn(),
    setEditPhone: vi.fn(),
    setEditBirth: vi.fn(),
    setEditGender: vi.fn(),
    setEditWeight: vi.fn(),
    setEditHeight: vi.fn(),
    setEditTargetW: vi.fn(),
    setEditBodyFat: vi.fn(),
    setEditStatus: vi.fn(),
    setEditObj: vi.fn(),
    saveEdit: vi.fn(),
    showExDbModal: false,
    setShowExDbModal: vi.fn(),
    exDbTargetDay: null,
    exDbSearch: '',
    setExDbSearch: vi.fn(),
    exDbResults: [],
    exDbAll: [],
    exDbFilter: 'Tous',
    setExDbFilter: vi.fn(),
    selectExercise: vi.fn(),
    showAiModal: false,
    aiGenerating: false,
    aiPreview: null,
    toast: null,
    ...overrides,
  } as unknown as ClientDetailState
}

function renderOverlay(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <ClientDetailPageOverlays
      detail={createDetail(overrides)}
      pendingTemplate={null}
      onClearPendingTemplate={vi.fn()}
    />,
  )
}

describe('client profile edit overlay contract', () => {
  it('renders a named dialog, linked information labels and accessible tabs', () => {
    const html = renderOverlay()

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Modifier le profil')
    expect(html).toContain('role="tablist"')
    expect(html.match(/role="tab"/g)).toHaveLength(3)
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toMatch(/<label[^>]+for="client-profile-edit-name-[^"]+"/)
    expect(html).toMatch(/<input[^>]+id="client-profile-edit-name-[^"]+"/)
    expect(html).toMatch(/<label[^>]+for="client-profile-edit-email-[^"]+"/)
    expect(html).toMatch(/<label[^>]+for="client-profile-edit-phone-[^"]+"/)
    expect(html).toMatch(/<label[^>]+for="client-profile-edit-birth-[^"]+"/)
    expect(html).toMatch(/<label[^>]+for="client-profile-edit-gender-[^"]+"/)
  })

  it('links every metrics label to its unchanged controlled field', () => {
    const html = renderOverlay({ editTab: 'metrics' })
    for (const field of ['weight', 'height', 'target-weight', 'body-fat']) {
      expect(html).toMatch(new RegExp(`<label[^>]+for="client-profile-edit-${field}-[^"]+"`))
      expect(html).toMatch(new RegExp(`<input[^>]+id="client-profile-edit-${field}-[^"]+"`))
    }
    expect(html).toContain('value="75"')
    expect(html).toContain('value="180"')
    expect(html).toContain('value="70"')
    expect(html).toContain('value="18"')
  })

  it('exposes status and objective as exclusive groups with selected state', () => {
    const html = renderOverlay({ editTab: 'status' })
    expect(html).toContain('role="group" aria-label="Statut"')
    expect(html).toContain('role="group" aria-label="Objectif"')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2)
    expect(html).toContain('Actif')
    expect(html).toContain('Maintien')
  })

  it('removes the profile form from the DOM while another overlay is active', () => {
    const html = renderOverlay({ editOpen: false, showExDbModal: true })
    expect(html).toContain('BASE D&#x27;EXERCICES')
    expect(html).not.toContain('Modifier le profil')
    expect(html).not.toContain('client-profile-edit-name-')
    expect(html).not.toContain('role="tablist"')
  })

  it('keeps the edit callback and persistence contract outside the migrated shell', () => {
    const overlay = readFileSync('app/client/[id]/components/page/ClientDetailPageOverlays.tsx', 'utf8')
    const controller = readFileSync('app/client/[id]/hooks/useClientDetailController.ts', 'utf8')
    const saveEdit = controller.slice(controller.indexOf('const saveEdit = async () => {'), controller.indexOf('/* ── Save calorie goal'))

    expect(overlay).toContain('onClick={h.saveEdit}')
    expect(overlay).toContain('onClose={()=>h.setEditOpen(false)}')
    expect(saveEdit).toContain("full_name: editName ? capitalizeFullName(editName) : null")
    expect(saveEdit).not.toMatch(/\bemail\s*:/)
    expect(saveEdit).not.toMatch(/\bstatus\s*:/)
    expect(saveEdit).toContain('updateClientDetailProfile(supabase as DatabaseClient')
    expect(saveEdit).toContain("await appendClientDetailWeight(supabase as DatabaseClient")
    expect(saveEdit).toContain("setEditOpen(false); showToast('Profil mis à jour')")
    expect(saveEdit).not.toContain('setSaving')
  })
})
