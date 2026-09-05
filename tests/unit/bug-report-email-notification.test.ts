import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const profileMaybeSingle = vi.fn()
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const reportSingle = vi.fn()
  const reportSelect = vi.fn(() => ({ single: reportSingle }))
  const reportInsert = vi.fn(() => ({ select: reportSelect }))
  const from = vi.fn((table: string) => (
    table === 'profiles'
      ? { select: profileSelect }
      : { insert: reportInsert }
  ))
  const createSupabaseRouteClient = vi.fn(async () => ({
    auth: { getUser },
    from,
  }))
  return {
    getUser,
    profileMaybeSingle,
    reportSingle,
    reportInsert,
    from,
    createSupabaseRouteClient,
    checkRateLimit: vi.fn(),
    sendEmail: vi.fn(),
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/email', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/email')>()
  return { ...actual, sendEmail: mocks.sendEmail }
})

import { POST } from '@/app/api/feedback/report/route'
import {
  renderBugReportNotificationTemplate,
  resolveBugReportAdminEmail,
} from '@/lib/email'

const USER = { id: 'user-1', email: 'reporter@example.test' }
const REPORT = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-08-26T10:00:00.000Z',
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://app.moovx.test/api/feedback/report', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.8',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const VALID_REPORT = {
  type: 'bug',
  title: 'Bouton bloqué',
  description: 'Le bouton ne répond plus.',
  page_url: 'https://app.moovx.test/home',
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BUG_REPORT_ADMIN_EMAIL = 'configured-admin@example.test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.moovx.test'
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null })
  mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 4 })
  mocks.profileMaybeSingle.mockResolvedValue({ data: { role: 'client' }, error: null })
  mocks.reportSingle.mockResolvedValue({ data: REPORT, error: null })
  mocks.sendEmail.mockResolvedValue({ success: true, method: 'sent' })
})

describe('POST /api/feedback/report', () => {
  it('rejects unauthenticated requests before rate limit and storage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await POST(request(VALID_REPORT))

    expect(response.status).toBe(401)
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('rejects invalid and secret-bearing payloads before storage', async () => {
    const response = await POST(request({
      ...VALID_REPORT,
      type: 'invalid',
      access_token: 'must-not-pass',
    }))

    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('enforces user and IP rate limits', async () => {
    mocks.checkRateLimit
      .mockReturnValueOnce({ allowed: false, remaining: 0, retryAfter: 42 })
      .mockReturnValueOnce({ allowed: true, remaining: 19 })

    const response = await POST(request(VALID_REPORT))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('stores the authenticated report before notifying the configured admin', async () => {
    const response = await POST(request(VALID_REPORT))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(mocks.reportInsert).toHaveBeenCalledWith({
      user_id: USER.id,
      user_email: USER.email,
      user_role: 'client',
      type: 'bug',
      title: VALID_REPORT.title,
      description: VALID_REPORT.description,
      page_url: VALID_REPORT.page_url,
    })
    expect(mocks.reportInsert.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sendEmail.mock.invocationCallOrder[0])
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'configured-admin@example.test',
      subject: '[MoovX] Nouveau signalement utilisateur',
    }))
    expect(payload.data).toEqual({ reportId: REPORT.id, notification: 'sent' })
  })

  it('uses the server fallback when the dedicated recipient is absent', async () => {
    delete process.env.BUG_REPORT_ADMIN_EMAIL
    expect(resolveBugReportAdminEmail()).toBe('bobitosm@gmail.com')

    await POST(request(VALID_REPORT))

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'bobitosm@gmail.com',
    }))
  })

  it('keeps a stored report successful when SMTP fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.sendEmail.mockResolvedValue({ success: false, method: 'error', error: 'SMTP secret detail' })

    const response = await POST(request(VALID_REPORT))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(mocks.reportInsert).toHaveBeenCalledOnce()
    expect(payload.data.notification).toBe('error')
    expect(JSON.stringify(warning.mock.calls)).not.toContain('SMTP secret detail')
    warning.mockRestore()
  })

  it('keeps a stored report successful when the email helper throws', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.sendEmail.mockRejectedValue(new Error('unexpected SMTP failure'))

    const response = await POST(request(VALID_REPORT))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(mocks.reportInsert).toHaveBeenCalledOnce()
    expect(payload.data.notification).toBe('error')
    expect(JSON.stringify(warning.mock.calls)).not.toContain('unexpected SMTP failure')
    warning.mockRestore()
  })

  it('keeps a stored report successful when SMTP is unavailable', async () => {
    mocks.sendEmail.mockResolvedValue({ success: true, method: 'skipped' })

    const response = await POST(request(VALID_REPORT))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.data.notification).toBe('skipped')
  })

  it('does not notify when storage fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.reportSingle.mockResolvedValue({ data: null, error: { message: 'sensitive DB detail' } })

    const response = await POST(request(VALID_REPORT))

    expect(response.status).toBe(500)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive DB detail')
    errorLog.mockRestore()
  })
})

describe('bug report notification security', () => {
  it('escapes user-controlled HTML and includes no session secrets', () => {
    const html = renderBugReportNotificationTemplate({
      reportId: REPORT.id,
      createdAt: REPORT.created_at,
      reportType: 'bug',
      title: '<img src=x onerror=alert(1)>',
      description: '<script>steal()</script>\nSecond line',
      pageUrl: 'https://app.moovx.test/?q=%3Cscript%3E',
      reporterEmail: 'reporter+<tag>@example.test',
      reporterRole: 'client<script>',
    })

    expect(html).not.toMatch(/<script>|<img src=x|client<script>/)
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;<br>Second line')
    expect(html).not.toMatch(/access_token|refresh_token|authorization|cookie|password|service.role/i)
  })

  it('moves the only report write to the server and preserves admin reply flow', () => {
    const client = readFileSync('app/components/BugReport.tsx', 'utf8')
    const route = readFileSync('app/api/feedback/report/route.ts', 'utf8')
    const replyRoute = readFileSync('app/api/admin/bug-reports/[id]/reply/route.ts', 'utf8')

    expect(client).toContain("fetch('/api/feedback/report'")
    expect(client).not.toContain("from('bug_reports')")
    expect(route).toContain(".from('bug_reports')")
    expect(replyRoute).toContain('to: report.user_email')
    expect(replyRoute).toContain('renderReplyTemplate')
  })
})
