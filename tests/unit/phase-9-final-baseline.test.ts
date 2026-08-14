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
    expect(baseline).toContain('`554575c`')
    expect(baseline).toContain('`0/0`')
    expect(baseline).toContain('`149/149`')
    expect(baseline).toContain('`145/145 ALIGNED`')
    expect(phaseNine).toContain('`145/145 ALIGNED`')
    expect(phaseNine).not.toMatch(/observe(?:nt)? 141\/145 versions/)
  })

  it('reconciles completed structural work with explicit monitoring states', () => {
    expect(baseline).toContain('`CI_STABILITY_CANDIDATE`')
    expect(baseline).toContain('`TRAINING_CANONICAL_MIGRATION_NOT_STARTED`')
    expect(baseline).toContain('`REAL_CORPUS_VALIDATION_PENDING`')
    expect(baseline).toContain('`PRODUCTION_PROMOTION_FORBIDDEN`')
    expect(baseline).toContain('`PHASE_9_COMPLETE_WITH_MONITORING_PENDING`')
    expect(baseline).toContain('`FUTURE_MIGRATION_RESERVED`')
    expect(phaseNine).toMatch(/\| \[x\] Ajouter les quality gates CI progressifs/)
    expect(phaseNine).toMatch(/\| \[x\] \[Établir la coexistence et la frontière de serving canonique Training/)
    expect(phaseNine).toContain('`1/150`')
    expect(phaseNine).toContain('`1/7`')
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

  it('preserves the historical verdict and records the reconciled status', () => {
    expect(baseline).toContain('`PHASE9_NOT_READY_TO_CLOSE`')
    expect(baseline).toContain("Ce verdict\nn'est pas un échec")
    expect(baseline).toContain('treize tâches sur quinze')
    expect(baseline).toContain('`PHASE_9_COMPLETE_WITH_MONITORING_PENDING`')
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
      'Valider le serving Training sur corpus organique staging',
      'Attester la stabilité CI',
      'Réintégrer les tests React serveur `.test.tsx`',
      "Auditer l'accessibilité de `Modal` et `ConfirmDialog`",
      'Remplacer le fallback Seedance local',
      'Réévaluer les index Nutrition sur nouvelle preuve',
    ]) expect(nextRoadmap).toContain(task)
  })

  it('marks structural Phase 9 tasks complete without closing monitoring evidence', () => {
    expect(phaseNine).toMatch(/\| \[x\] \[Produire la baseline finale\]/)
    expect(phaseNine).toContain('`PHASE_9_COMPLETE_WITH_MONITORING_PENDING`')
    expect(phaseNine).toContain('`CI_STABILITY_CANDIDATE`')
    expect(phaseNine).toContain('`REAL_CORPUS_VALIDATION_PENDING`')
    expect(nextRoadmap).toContain('`legacy-only`')
  })
})
