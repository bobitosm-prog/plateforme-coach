import { describe, expect, it } from 'vitest'
import { parseNotificationDestination, requireNotificationDestination } from '../../lib/notifications/destination'

describe('notification destination contract', () => {
  it.each([
    '/',
    '/coach',
    '/weekly-diagnostic/abc?tab=summary#score',
    '/path/to/resource?next=%2Fcoach#details',
  ])('accepts unambiguous internal path %s', value => {
    expect(parseNotificationDestination(value)).toEqual({ ok: true, value })
  })

  it.each([
    ['https://evil.example', 'absolute HTTPS URL'],
    ['http://evil.example', 'absolute HTTP URL'],
    ['//evil.example', 'protocol-relative URL'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['data:text/html,evil', 'data scheme'],
    ['file:///etc/passwd', 'file scheme'],
    ['/safe\\evil', 'backslash'],
    ['/safe\n/evil', 'line feed'],
    ['/safe\u0000evil', 'control character'],
    [' /safe', 'leading space'],
    ['/safe ', 'trailing space'],
    ['/safe%20path', 'encoded space'],
    ['/%2F%2Fevil.example', 'encoded external URL'],
    ['/%252F%252Fevil.example', 'double-encoded external URL'],
    ['/%255Cevil', 'double-encoded backslash'],
    ['/%250Aevil', 'double-encoded line feed'],
    ['', 'empty string'],
  ])('rejects %s (%s)', (value) => {
    expect(parseNotificationDestination(value).ok).toBe(false)
  })

  it.each([undefined, null, 42, true, {}, []])('rejects non-text value %j', value => {
    expect(parseNotificationDestination(value).ok).toBe(false)
  })

  it('throws for invalid destinations used by controlled server producers', () => {
    expect(() => requireNotificationDestination('https://evil.example')).toThrow('Invalid notification destination')
  })
})
