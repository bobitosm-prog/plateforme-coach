import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const baselinePath = resolve(root, 'docs/PHASE_9_FINAL_BASELINE.md')
const nextRoadmapPath = resolve(root, 'docs/ROADMAP_NEXT.md')
const baseline = read('docs/PHASE_9_FINAL_BASELINE.md')
const nextRoadmap = read('docs/ROADMAP_NEXT.md')
const roadmap = read('ROADMAP_CODEX.md')
const phaseNine = roadmap.slice(roadmap.indexOf('## Phase 9 —'))

describe('Phase 9 final baseline documentation contract', () => {
  it('creates and cross-links the final baseline and next roadmap', () => {
    expect(existsSync(baselinePath)).toBe(true)
    expect(existsSync(nextRoadmapPath)).toBe(true)
    expect(baseline).toContain('[roadmap suivante](ROADMAP_NEXT.md)')
    expect(nextRoadmap).toContain('[baseline finale Phase 9](PHASE_9_FINAL_BASELINE.md)')
    expect(existsSync(resolve(dirname(baselinePath), 'ROADMAP_NEXT.md'))).toBe(true)
  })

  it('records the current Git and Supabase baseline', () => {
    expect(baseline).toContain('`phase-6-staging`')
    expect(baseline).toContain('`25c7426`')
    expect(baseline).toContain('`0/0`')
    expect(baseline).toContain('`149/149`')
    expect(baseline).toContain('`145/145 ALIGNED`')
    expect(phaseNine).toContain('`145/145 ALIGNED`')
    expect(phaseNine).not.toMatch(/observe(?:nt)? 141\/145 versions/)
  })

  it('keeps CI and Training explicitly open', () => {
    expect(baseline).toContain('`CI_STABILITY_CANDIDATE`')
    expect(baseline).toContain('`TRAINING_CANONICAL_MIGRATION_NOT_STARTED`')
    expect(baseline).toContain('`FUTURE_MIGRATION_RESERVED`')
    expect(phaseNine).toMatch(/\| \[ \] Ajouter les quality gates CI progressifs/)
    expect(phaseNine).toMatch(/\| \[ \] \[Achever la migration runtime Training/)
  })

  it('records the test, rollback and dependency evidence', () => {
    for (const evidence of [
      '339 fichiers',
      '3 098 tests `PASS`',
      '91/91 routes/pages',
      '15/15',
      '58/58',
      '177,483 s',
      '55 → 41',
      '124 nœuds',
      '`DEPENDENCY_CLEANUP_COMPLETE`',
    ]) expect(baseline).toContain(evidence)
  })

  it('keeps the Phase 9 verdict open without presenting it as a failure', () => {
    expect(baseline).toContain('`PHASE9_NOT_READY_TO_CLOSE`')
    expect(baseline).toContain("Ce verdict\nn'est pas un échec")
    expect(baseline).toContain('treize tâches sur quinze')
    expect(baseline).not.toContain('`PHASE9_READY_TO_CLOSE`')
  })

  it('does not claim stable CI, maximum capacity or Production validation', () => {
    const documents = `${baseline}\n${nextRoadmap}`
    expect(documents).not.toContain('`CI_STABLE`')
    expect(documents).not.toContain('`CAPACITY_VALIDATED`')
    expect(documents).not.toMatch(/Production (?:est|désormais) validée/i)
    expect(baseline).toContain("Production n'a pas été\ntouchée ni déclarée validée")
  })

  it('prioritizes only the evidence-backed next work', () => {
    for (const section of ['## P0 — Critique', '## P1 — Haute', '## P2 — Moyenne', '## P3 — Faible']) {
      expect(nextRoadmap).toContain(section)
    }
    for (const task of [
      'Achever la migration runtime Training canonique',
      'Attester la stabilité CI',
      'Réintégrer les tests React serveur `.test.tsx`',
      "Auditer l'accessibilité de `Modal` et `ConfirmDialog`",
      'Remplacer le fallback Seedance local',
      'Réévaluer les index Nutrition sur nouvelle preuve',
    ]) expect(nextRoadmap).toContain(task)
  })

  it('marks only the baseline task complete among the three formerly open tasks', () => {
    expect(phaseNine).toMatch(/\| \[x\] \[Produire la baseline finale\]/)
    expect(phaseNine).toContain('`PHASE9_NOT_READY_TO_CLOSE`')
    expect(phaseNine).toContain('`CI_STABILITY_CANDIDATE`')
    expect(phaseNine).toContain('`TRAINING_CANONICAL_MIGRATION_NOT_STARTED`')
  })
})
