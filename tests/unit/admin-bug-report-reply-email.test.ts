import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const reportSingle = vi.fn()
  const profileSingle = vi.fn()
  const updatedSingle = vi.fn()
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: updatedSingle })),
    })),
  }))
  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: profileSingle })),
        })),
      }
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: reportSingle })),
      })),
      update,
    }
  })

  return {
    from,
    reportSingle,
    profileSingle,
    updatedSingle,
    update,
    verifyAdmin: vi.fn(),
    logAdminAction: vi.fn(),
    sendEmail: vi.fn(),
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: mocks.from },
}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: mocks.verifyAdmin,
  handleAdminAuthError: () => new Response(
    JSON.stringify({ error: 'Internal server error' }),
    { status: 500 },
  ),
}))
vi.mock('@/lib/admin/logger', () => ({
  logAdminAction: mocks.logAdminAction,
}))
vi.mock('@/lib/email', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/email')>()
  return { ...actual, sendEmail: mocks.sendEmail }
})

import { POST } from '@/app/api/admin/bug-reports/[id]/reply/route'

const REPORT_ID = '11111111-1111-4111-8111-111111111111'
const REPORT = {
  id: REPORT_ID,
  title: 'Probleme de test',
  type: 'bug',
  user_id: '22222222-2222-4222-8222-222222222222',
  user_email: 'reporter@example.test',
  user_role: 'client',
  status: 'nouveau',
}
const UPDATED = {
  id: REPORT_ID,
  admin_reply: 'Reponse de test',
  replied_at: '2026-08-26T10:00:00.000Z',
  replied_by: 'admin@example.test',
  status: 'en_cours',
  updated_at: '2026-08-26T10:00:00.000Z',
  read_by_user: false,
}

function request(sendEmail = true) {
  return new Request(`https://app.moovx.test/api/admin/bug-reports/${REPORT_ID}/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reply: 'Reponse de test', send_email: sendEmail }),
  })
}

async function reply(sendEmail = true) {
  return POST(request(sendEmail), { params: Promise.resolve({ id: REPORT_ID }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAdmin.mockResolvedValue({
    userId: '33333333-3333-4333-8333-333333333333',
    email: 'admin@example.test',
  })
  mocks.reportSingle.mockResolvedValue({ data: REPORT, error: null })
  mocks.profileSingle.mockResolvedValue({ data: { full_name: 'Test User' }, error: null })
  mocks.updatedSingle.mockResolvedValue({ data: UPDATED, error: null })
  mocks.logAdminAction.mockResolvedValue(undefined)
  mocks.sendEmail.mockResolvedValue({ success: true, method: 'sent' })
})

describe('admin bug report reply email contract', () => {
  it('returns sent after preserving the DB-first reply flow', async () => {
    const response = await reply()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.email).toEqual({ method: 'sent' })
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(mocks.update.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sendEmail.mock.invocationCallOrder[0])
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
  })

  it('keeps a skipped delivery explicit without leaking transport details', async () => {
    mocks.sendEmail.mockResolvedValue({ success: true, method: 'skipped' })

    const payload = await (await reply()).json()

    expect(payload.email).toEqual({ method: 'skipped' })
    expect(JSON.stringify(payload)).not.toMatch(/smtp|password|auth plain/i)
  })

  it('preserves the DB reply and reports a genuine failure with a safe code', async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      method: 'error',
      errorCode: 'EAUTH',
      error: 'Invalid login: 535 5.7.0 Invalid login or password; AUTH PLAIN',
    })

    const response = await reply()
    const payload = await response.json()
    const serialized = JSON.stringify(payload)

    expect(response.status).toBe(200)
    expect(payload.report).toEqual(UPDATED)
    expect(payload.email).toEqual({ method: 'error', code: 'EMAIL_SEND_FAILED' })
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    expect(serialized).not.toMatch(/535|EAUTH|AUTH PLAIN|Invalid login|password/i)
  })

  it('does not send when the admin explicitly disables email', async () => {
    const payload = await (await reply(false)).json()

    expect(payload.email).toBeNull()
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('uses only generic UI messages and keeps the new-report flow unchanged', () => {
    const ui = readFileSync(
      'app/(application)/admin/feedback/_components/FeedbackDetailDialog.tsx',
      'utf8',
    )
    const replyRoute = readFileSync(
      'app/api/admin/bug-reports/[id]/reply/route.ts',
      'utf8',
    )
    const newReportRoute = readFileSync('app/api/feedback/report/route.ts', 'utf8')
    const helper = readFileSync('lib/email.ts', 'utf8')

    expect(ui).toContain("toast.success('Réponse envoyée')")
    expect(ui).toContain("Réponse sauvegardée, mais l'email n'a pas été envoyé.")
    expect(ui).toContain("Réponse sauvegardée, mais l'email n'a pas pu être envoyé.")
    expect(ui).not.toContain('res.email.error')
    expect(replyRoute).not.toContain('result.error')
    expect(replyRoute).toContain("code: 'EMAIL_SEND_FAILED'")
    expect(helper).toContain(
      "console.error('[email] Envoi echoue', { emailMethod: 'error', errorCode })",
    )
    expect(newReportRoute).toContain('notification: notificationMethod')
    expect(newReportRoute).not.toContain('notification.error')
  })
})
