import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sitemap from '../../app/sitemap'
import { getAllPosts } from '../../content/blog/posts'
import { getAllGuides } from '../../content/guides/guides'
import { LEGAL_DOCUMENT_METADATA } from '../../content/legal/metadata'
import { LOCALES } from '../../lib/seo'

const SITE_URL = 'https://moovx.ch'

function findEntry(path: string) {
  return sitemap().find(entry => entry.url === `${SITE_URL}${path}`)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('sitemap editorial lastModified dates', () => {
  it('keeps exactly 30 unique canonical URLs', () => {
    const entries = sitemap()

    expect(entries).toHaveLength(30)
    expect(new Set(entries.map(entry => entry.url)).size).toBe(30)
  })

  it('is invariant when the system clock changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2035-01-01T12:00:00Z')
    const first = sitemap()
    vi.setSystemTime('2045-12-31T23:59:59Z')
    const second = sitemap()

    expect(second).toEqual(first)
    expect(readFileSync('app/sitemap.ts', 'utf8')).not.toContain('new Date')
  })

  it.each(LOCALES)('omits lastModified for the %s Landing', locale => {
    const entry = findEntry(`/${locale}/landing`)

    expect(entry).toMatchObject({ priority: 1, changeFrequency: 'weekly' })
    expect(entry).not.toHaveProperty('lastModified')
  })

  it('uses each article publication date as the stable fallback', () => {
    for (const post of getAllPosts()) {
      expect(post.dateModified).toBeUndefined()
      for (const locale of LOCALES) {
        expect(findEntry(`/${locale}/blog/${post.slug}`)).toMatchObject({
          lastModified: post.date,
          priority: 0.7,
          changeFrequency: 'monthly',
        })
      }
    }
  })

  it('derives the Blog index date from the latest effective article date', () => {
    const expected = getAllPosts()
      .map(post => post.dateModified ?? post.date)
      .reduce((latest, date) => date > latest ? date : latest)

    expect(expected).toBe('2026-06-05')
    for (const locale of LOCALES) {
      expect(findEntry(`/${locale}/blog`)).toMatchObject({
        lastModified: expected,
        priority: 0.8,
        changeFrequency: 'weekly',
      })
    }
  })

  it('uses each guide editorial modification date and keeps guides French-only', () => {
    for (const guide of getAllGuides()) {
      expect(findEntry(`/fr/guides/${guide.slug}`)).toMatchObject({
        lastModified: '2026-08-16',
        priority: 0.8,
        changeFrequency: 'monthly',
      })
      expect(findEntry(`/en/guides/${guide.slug}`)).toBeUndefined()
      expect(findEntry(`/de/guides/${guide.slug}`)).toBeUndefined()
    }
  })

  it.each(['privacy', 'cgu'] as const)('uses the versioned %s legal date in every locale', page => {
    expect(LEGAL_DOCUMENT_METADATA[page].lastModified).toBe('2026-05-17')
    for (const locale of LOCALES) {
      expect(findEntry(`/${locale}/${page}`)?.lastModified).toBe('2026-05-17')
    }
  })

  it('keeps multilingual alternates unchanged', () => {
    const multilingualEntries = sitemap().filter(entry => entry.alternates?.languages?.en)

    for (const entry of multilingualEntries) {
      const path = new URL(entry.url).pathname.replace(/^\/(fr|en|de)/, '')
      expect(entry.alternates?.languages).toEqual({
        fr: `${SITE_URL}/fr${path}`,
        en: `${SITE_URL}/en${path}`,
        de: `${SITE_URL}/de${path}`,
        'x-default': `${SITE_URL}/fr${path}`,
      })
    }
  })

  it('emits only stable ISO calendar dates', () => {
    const datedEntries = sitemap().filter(entry => entry.lastModified)

    expect(datedEntries).toHaveLength(26)
    for (const entry of datedEntries) {
      expect(entry.lastModified).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    }
  })
})
