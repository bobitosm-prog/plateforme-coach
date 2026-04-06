import { describe, it, expect } from 'vitest'
import * as tokens from '../../lib/design-tokens'

describe('Design Tokens', () => {
  it('exports all required color tokens', () => {
    expect(tokens.BG_BASE).toBeDefined()
    expect(tokens.BG_CARD).toBeDefined()
    expect(tokens.GOLD).toBeDefined()
    expect(tokens.TEXT_PRIMARY).toBeDefined()
    expect(tokens.TEXT_MUTED).toBeDefined()
    expect(tokens.BORDER).toBeDefined()
  })

  it('has Swiss Luxury warm colors (not cold grays)', () => {
    // Background should be warm (not pure black #000)
    expect(tokens.BG_BASE).not.toBe('#000000')
    expect(tokens.BG_BASE).not.toBe('#000')
    // Gold should be warm copper, not bright yellow
    expect(tokens.GOLD).toMatch(/^#[dD][0-9a-fA-F]/)
  })

  it('exports font families', () => {
    expect(tokens.FONT_DISPLAY).toContain('Bebas')
    expect(tokens.FONT_ALT).toContain('Barlow')
    expect(tokens.FONT_BODY).toContain('DM Sans')
  })

  it('exports border radius values', () => {
    expect(tokens.RADIUS_CARD).toBeGreaterThan(0)
    expect(tokens.RADIUS_BTN).toBeGreaterThan(0)
    expect(tokens.RADIUS_INPUT).toBeGreaterThan(0)
  })

  it('exports activity levels', () => {
    expect(tokens.ACTIVITY_LEVELS).toHaveLength(5)
    expect(tokens.ACTIVITY_LEVELS[0].mult).toBe(1.2)
    expect(tokens.ACTIVITY_LEVELS[4].mult).toBe(1.9)
  })

  it('exports nutrition day keys', () => {
    expect(tokens.NUTRITION_DAYS).toHaveLength(7)
    expect(tokens.NUTRITION_DAYS[0].key).toBe('lundi')
    expect(tokens.NUTRITION_DAYS[6].key).toBe('dimanche')
  })

  it('todayNutritionKey returns a valid day', () => {
    const key = tokens.todayNutritionKey()
    const validDays = tokens.NUTRITION_DAYS.map(d => d.key)
    expect(validDays).toContain(key)
  })
})
