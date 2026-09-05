import { describe, expect, it } from 'vitest'
import {
  appNavigationHref,
  normalizeAppNavigationQuery,
  parseAppNavigation,
  serializeAppNavigation,
} from '@/lib/navigation/app-navigation'

const params = (value = '') => new URLSearchParams(value)

describe('app navigation query contract', () => {
  it.each([
    ['', { tab: 'home' }, ''],
    ['tab=training', { tab: 'training' }, 'tab=training'],
    ['tab=nutrition', { tab: 'nutrition' }, 'tab=nutrition'],
    ['tab=progression', { tab: 'progression' }, 'tab=progression'],
    ['tab=account', { tab: 'account' }, 'tab=account'],
  ] as const)('parses and serializes %s', (query, state, canonical) => {
    expect(parseAppNavigation(params(query))).toEqual(state)
    expect(serializeAppNavigation(state)).toBe(canonical)
  })

  it('reconstructs Account programs, training program and configure mode', () => {
    expect(parseAppNavigation(params('tab=account&section=programs'))).toEqual({ tab: 'account', section: 'programs' })
    expect(parseAppNavigation(params('tab=account&section=training-program'))).toEqual({ tab: 'account', section: 'training-program' })
    const configure = { tab: 'account', section: 'training-program', mode: 'configure' } as const
    expect(parseAppNavigation(params(serializeAppNavigation(configure)))).toEqual(configure)
    expect(appNavigationHref(configure)).toBe('/?tab=account&section=training-program&mode=configure')
  })

  it('normalizes invalid navigation without dropping unrelated callback params', () => {
    expect(normalizeAppNavigationQuery(params('tab=foobar'))).toBe('')
    expect(normalizeAppNavigationQuery(params('tab=account&section=unknown'))).toBe('tab=account')
    expect(normalizeAppNavigationQuery(params('mode=configure'))).toBe('')
    expect(normalizeAppNavigationQuery(params('payment=success&tab=foobar'))).toBe('payment=success')
  })

  it('never serializes transient modal, timer or workout state', () => {
    const source = serializeAppNavigation({ tab: 'training' })
    expect(source).not.toMatch(/modal|timer|history|workout|draft/)
  })
})
