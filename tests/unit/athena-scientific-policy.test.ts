import { describe, expect, it } from 'vitest'
import { COACH_SYSTEM_PROMPT } from '@/lib/coach-knowledge'
import {
  ATHENA_EVIDENCE_LIBRARY,
  buildAthenaScientificPolicyPrompt,
} from '@/lib/athena/scientific-policy'

describe('Athena scientific policy', () => {
  it('uses a versioned and uniquely identified evidence library', () => {
    const ids = ATHENA_EVIDENCE_LIBRARY.map(source => source.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining([
      'ACSM_RT_2026',
      'WHO_DIET_2026',
      'MORTON_PROTEIN_2018',
      'AASM_SLEEP_2015',
    ]))
    expect(buildAthenaScientificPolicyPrompt()).toContain('version="2026-09-13.v1"')
  })

  it('removes unsupported absolutes from the conversational coach', () => {
    expect(COACH_SYSTEM_PROMPT).not.toContain('PPL 6 jours optimal')
    expect(COACH_SYSTEM_PROMPT).not.toContain('TOUJOURS isolation en premier')
    expect(COACH_SYSTEM_PROMPT).not.toContain('Pelland 2026')
    expect(COACH_SYSTEM_PROMPT).not.toContain('vitamine D 1000-2000UI')
    expect(COACH_SYSTEM_PROMPT).not.toContain('48-72h fenetre optimale')
  })

  it('treats practical foods as options instead of miracle prescriptions', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('sardines ou autre poisson gras')
    expect(COACH_SYSTEM_PROMPT).toContain('noix et graines')
    expect(COACH_SYSTEM_PROMPT).toContain("huile d'olive")
    expect(COACH_SYSTEM_PROMPT).toContain('jamais comme aliments miracles')
    expect(COACH_SYSTEM_PROMPT).toContain("Ne prétends pas que l'huile doit être crue")
  })

  it('requires data sufficiency, uncertainty and safety escalation', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('couverture des journaux')
    expect(COACH_SYSTEM_PROMPT).toContain("Une association observée n'établit jamais une causalité")
    expect(COACH_SYSTEM_PROMPT).toContain('douleur thoracique')
    expect(COACH_SYSTEM_PROMPT).toContain("N'invente jamais d'étude")
  })

  it('does not impose supplements automatically', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('Ne recommande jamais automatiquement vitamine D, oméga-3, caféine')
    expect(COACH_SYSTEM_PROMPT).toContain('Approche food-first')
  })
})
