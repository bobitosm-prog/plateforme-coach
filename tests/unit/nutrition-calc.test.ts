import { describe, it, expect } from 'vitest'
import { calcMifflinStJeor, calcHarrisBenedict, calcKatchMcArdle } from '../../lib/design-tokens'

describe('Nutrition Calculations', () => {
  describe('Mifflin-St Jeor', () => {
    it('calculates BMR for male', () => {
      // 80kg, 180cm, 30 years, male
      const bmr = calcMifflinStJeor(80, 180, 30, 'male')
      expect(bmr).toBe(10 * 80 + 6.25 * 180 - 5 * 30 + 5)
      expect(bmr).toBe(1780)
    })

    it('calculates BMR for female', () => {
      const bmr = calcMifflinStJeor(65, 165, 28, 'female')
      expect(bmr).toBe(10 * 65 + 6.25 * 165 - 5 * 28 - 161)
      expect(bmr).toBe(1380.25)
    })

    it('returns lower BMR for female vs male same stats', () => {
      const male = calcMifflinStJeor(75, 175, 30, 'male')
      const female = calcMifflinStJeor(75, 175, 30, 'female')
      expect(male).toBeGreaterThan(female)
      expect(male - female).toBe(166) // 5 - (-161) = 166
    })
  })

  describe('Harris-Benedict', () => {
    it('calculates BMR for male', () => {
      const bmr = calcHarrisBenedict(80, 180, 30, 'male')
      expect(bmr).toBeGreaterThan(1700)
      expect(bmr).toBeLessThan(2000)
    })
  })

  describe('Katch-McArdle', () => {
    it('calculates BMR from lean mass', () => {
      const bmr = calcKatchMcArdle(80, 15) // 80kg, 15% body fat
      const leanMass = 80 * 0.85
      expect(bmr).toBe(370 + 21.6 * leanMass)
    })
  })

  describe('TDEE with activity multipliers', () => {
    it('sedentary TDEE', () => {
      const bmr = calcMifflinStJeor(80, 180, 30, 'male')
      expect(Math.round(bmr * 1.2)).toBe(2136)
    })

    it('very active TDEE', () => {
      const bmr = calcMifflinStJeor(80, 180, 30, 'male')
      expect(Math.round(bmr * 1.725)).toBe(3071)
    })
  })
})
