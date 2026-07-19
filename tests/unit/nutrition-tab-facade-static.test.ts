import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const facadePath = path.join(root, 'app/components/tabs/NutritionTab.tsx')
const boundaries = ['NutritionJournalMealsSection.tsx', 'NutritionPlanContent.tsx', 'NutritionTabOverlays.tsx'].map(file => path.join(root, 'app/components/tabs/nutrition', file))

describe('NutritionTab facade boundaries', () => {
  it('keeps the facade and every new boundary below 500 lines', () => {
    for (const file of [facadePath, ...boundaries]) expect(fs.readFileSync(file, 'utf8').split('\n').length, path.basename(file)).toBeLessThan(500)
  })

  it('delegates journal, plan and overlays while preserving the public export', () => {
    const source = fs.readFileSync(facadePath, 'utf8')
    expect(source).toContain('export default function NutritionTab')
    for (const name of ['NutritionJournalMealsSection', 'NutritionPlanContent', 'NutritionTabOverlays']) expect(source).toContain(`<${name}`)
  })

  it('keeps presentation boundaries free of data clients and unsafe additions', () => {
    for (const file of boundaries) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source).not.toMatch(/createClient|service_role|\.from\(|select\(['"]\*['"]\)|\bany\b/)
      expect(source).not.toMatch(/@\/lib\/supabase|@\/lib\/repositories|from ['"]app\//)
    }
  })
})
