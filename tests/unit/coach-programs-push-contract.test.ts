import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const coachPrograms = readFileSync('app/coach/components/CoachPrograms.tsx', 'utf8')
const dialog = readFileSync('app/coach/components/CoachTemplatePushDialog.tsx', 'utf8')

const confirmStart = coachPrograms.indexOf('async function handleConfirmPush()')
const confirmEnd = coachPrograms.indexOf('function startEdit', confirmStart)
const confirmPush = coachPrograms.slice(confirmStart, confirmEnd)

describe('CoachPrograms template push contract', () => {
  it('keeps the authoritative bulk update and its guards in CoachPrograms', () => {
    expect(confirmPush).toContain("if (!pushTarget || pushTarget.impactedClients.length === 0) return")
    expect(confirmPush).toContain('const tplDays = pushTarget.template.days || []')
    expect(confirmPush).toContain('if (!Array.isArray(tplDays)) { setPushing(false); return }')
    expect(confirmPush).toContain('if (tplDays.length === 0)')
    expect(confirmPush).toContain(".from('client_programs')")
    expect(confirmPush).toContain('.update({ program: tplDays, updated_at: new Date().toISOString() })')
    expect(confirmPush).toContain(".eq('training_program_id', pushTarget.template.id)")
    expect(confirmPush.match(/\.update\(/g)).toHaveLength(1)
    expect(confirmPush).not.toMatch(/for\s*\(|\.map\s*\(/)
  })

  it('keeps success, failure and reactivation behavior unchanged', () => {
    expect(confirmPush).toContain('setPushTarget(null)')
    expect(confirmPush).toContain('toast.success(`${count} client(s) mis a jour ✓`)')
    expect(confirmPush).toContain('toast.error(`Erreur de mise a jour : ${error.message}`)')
    expect(confirmPush).toContain("toast.error('Erreur inattendue')")
    expect(confirmPush.match(/setPushing\(false\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps all Supabase authority out of the presentation-only dialog', () => {
    expect(dialog).not.toMatch(/supabase|client_programs|\.from\(['"]|\.update\(\s*\{/i)
    expect(coachPrograms).toContain('<CoachTemplatePushDialog')
    expect(coachPrograms).toContain('onConfirm={handleConfirmPush}')
    expect(coachPrograms).toContain('onCancel={() => setPushTarget(null)}')
    expect(coachPrograms).toContain('aria-label="Pusher la mise à jour aux clients"')
  })

  it('leaves the other CoachPrograms overlays on their existing paths', () => {
    expect(coachPrograms).toContain('{assignModal && (')
    expect(coachPrograms).toContain('<ConfirmDialog')
    expect(coachPrograms).toContain('open={!!programToDelete}')
    expect(coachPrograms).toContain('onConfirm={() => programToDelete && deleteProgram(programToDelete.id)}')
  })
})
