import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const bugReport = read('app/components/BugReport.tsx')
const account = read('app/components/tabs/AccountTab.tsx')
const clientShell = read('app/(application)/page.tsx')
const coachShell = read('app/(application)/coach/page.tsx')
const coachProfile = read('app/(application)/coach/components/CoachProfile.tsx')

describe('Bug report account entry', () => {
  it('removes every global floating BugReport mount', () => {
    expect(clientShell).not.toContain('<BugReport')
    expect(coachShell).not.toContain('<BugReport')
    expect(bugReport).not.toContain('bug-report-fab')
    expect(bugReport).not.toContain('Z_FAB')
  })

  it('opens the existing report form from the client Account tab', () => {
    expect(account).toContain("t('reportProblem')")
    expect(account).toContain("t('reportProblemDescription')")
    expect(account).toContain('onClick={() => setBugReportOpen(true)}')
    expect(account).toContain('open={bugReportOpen}')
    expect(account).toContain('onOpenChange={setBugReportOpen}')
  })

  it('preserves report access for coaches without a floating trigger', () => {
    expect(coachProfile).toContain('onClick={() => setBugReportOpen(true)}')
    expect(coachProfile).toContain('<BugReport')
    expect(coachProfile).toContain('open={bugReportOpen}')
  })

  it('uses the authenticated server route without duplicating the payload', () => {
    expect(bugReport).toContain("fetch('/api/feedback/report'")
    for (const field of ['type,', 'title:', 'description:', 'page_url:']) {
      expect(bugReport).toContain(field)
    }
    expect(bugReport).not.toContain("from('bug_reports')")
  })

  it.each([
    ['fr', 'Signaler un problème'],
    ['en', 'Report a problem'],
    ['de', 'Problem melden'],
  ])('provides the %s account label', (locale, label) => {
    const messages = JSON.parse(read(`messages/${locale}.json`))
    expect(messages.account.reportProblem).toBe(label)
    expect(messages.account.reportProblemDescription).toBeTruthy()
  })

  it('keeps Athena and removes BugReport from the clearance calculation', () => {
    expect(clientShell).toContain('className="client-athena-fab"')
    expect(clientShell).toContain('--mobile-athena-fab-size: 52px')
    expect(clientShell).not.toContain('--mobile-chat-fab-size')
  })
})
