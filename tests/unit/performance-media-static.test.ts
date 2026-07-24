import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('media delivery boundaries', () => {
  it('uses the bounded logo derivative on critical local routes', () => {
    const paths = [
      'app/components/dashboard/DashboardServerFallback.tsx',
      'app/components/dashboard/DashboardProfileError.tsx',
      'app/components/dashboard/DashboardClientIsland.tsx',
      'app/coach/components/CoachPageContent.tsx',
      'app/coach/components/sections/CoachDesktopLayout.tsx',
    ]
    for (const path of paths) {
      const source = read(path)
      expect(source, path).toContain('/logo-moovx-96.png')
      expect(source, path).not.toContain('src="/logo-moovx.png"')
    }
  })

  it('does not preload secondary feedback videos', () => {
    expect(read('app/coach/components/CoachVideoReviews.tsx')).toContain('preload="none"')
    expect(read('app/components/VideoFeedbackHistory.tsx')).toContain('preload="none"')
  })

  it('keeps the inventory independent from network and protected media contents', () => {
    const source = read('scripts/inventory-runtime-media.ts')
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(/https?:\/\//)
    expect(source).toContain('if (PROTECTED.has(path)) continue')
    expect(source).toContain("remoteMediaDownloaded: false")
  })
})
