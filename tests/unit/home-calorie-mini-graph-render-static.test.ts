import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const energyCard = fs.readFileSync(
  path.join(process.cwd(), 'app/components/home/cards/EnergyCard.tsx'),
  'utf8',
)

describe('Home calorie mini-graph rendering contract', () => {
  it('keeps the EnergyCard prop names while allowing explicit graphical gaps', () => {
    expect(energyCard).toContain('consumedKcal: number')
    expect(energyCard).toContain('calorieGoal: number')
    expect(energyCard).toContain(
      'weekData: Array<{ day: string; calories: number | null }>',
    )
  })

  it('renders real zeroes and splits the sparkline at unknown points', () => {
    expect(energyCard).toContain('const hasData = knownData.length > 0')
    expect(energyCard).toContain(
      'const previousIsKnown = index > 0 && weekData[index - 1]?.calories !== null',
    )
    expect(energyCard).not.toContain('weekData.some(d => d.calories > 0)')
  })
})
