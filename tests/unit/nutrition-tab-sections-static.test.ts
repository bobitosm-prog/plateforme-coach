import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('NutritionTab section boundaries', () => {
  const files = ['NutritionCalendarSection.tsx', 'NutritionSummarySection.tsx', 'NutritionPlanSection.tsx', 'NutritionSavedMealsSection.tsx']
  const sections = files.map(file => readFileSync(`app/components/tabs/nutrition/${file}`, 'utf8')).join('\n')
  const facade = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')

  it('keeps presentation sections free of data authority and direct effects', () => {
    expect(sections).not.toMatch(/supabase|createClient|service_role|\.from\(|\.insert\(|\.update\(|\.delete\(|useEffect|localStorage|sessionStorage/)
    expect(sections).not.toMatch(/:\s*any\b|<any>|select\(['"]\*['"]\)/)
  })

  it('wires each extracted section from the NutritionTab facade', () => {
    for (const name of ['NutritionCalendarSection', 'NutritionSummarySection', 'NutritionPlanSection', 'NutritionSavedMealsSection']) {
      expect(facade).toContain(`<${name}`)
    }
  })

  it('keeps NutritionTab public props and domain hooks intact', () => {
    expect(facade).toContain('export default function NutritionTab')
    expect(facade).toContain('useNutritionJournal({')
    expect(facade).toContain('useNutritionPlans({')
    expect(facade).not.toContain('createClient')
  })
})
