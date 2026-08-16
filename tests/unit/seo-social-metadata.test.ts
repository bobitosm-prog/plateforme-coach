import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  generateMetadata as generateBlogIndexMetadata,
} from '../../app/(marketing)/[locale]/blog/page'
import {
  generateMetadata as generateBlogArticleMetadata,
} from '../../app/(marketing)/[locale]/blog/[slug]/page'
import { getAllPosts } from '../../content/blog/posts'
import {
  MARKETING_SOCIAL_IMAGE_URL,
  buildMarketingSocialImage,
  type Locale,
} from '../../lib/seo'

const locales: Locale[] = ['fr', 'en', 'de']

describe('marketing social metadata', () => {
  it('ships a real 1200x630 JPEG card', async () => {
    const image = await sharp('public/og-image.jpg').metadata()

    expect(image).toMatchObject({ width: 1200, height: 630, format: 'jpeg' })
    expect(image.channels).toBeGreaterThanOrEqual(3)
  })

  it('defines one complete marketing-domain fallback image', () => {
    expect(MARKETING_SOCIAL_IMAGE_URL).toBe('https://moovx.ch/og-image.jpg')
    expect(buildMarketingSocialImage('MoovX')).toEqual({
      url: 'https://moovx.ch/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'MoovX',
      type: 'image/jpeg',
    })
  })

  it.each(locales)('publishes complete Blog index cards for %s', async locale => {
    const metadata = await generateBlogIndexMetadata({ params: Promise.resolve({ locale }) })

    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: `https://moovx.ch/${locale}/blog`,
      siteName: 'MoovX',
      images: [{ url: MARKETING_SOCIAL_IMAGE_URL, width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [{ url: MARKETING_SOCIAL_IMAGE_URL }],
    })
    expect(JSON.stringify(metadata)).not.toContain('app.moovx.ch')
  })

  it.each(getAllPosts())('publishes a fallback card for article $slug', async post => {
    const metadata = await generateBlogArticleMetadata({
      params: Promise.resolve({ locale: 'fr', slug: post.slug }),
    })

    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      publishedTime: post.date,
      images: [{ url: MARKETING_SOCIAL_IMAGE_URL, width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [{ url: MARKETING_SOCIAL_IMAGE_URL }],
    })
    expect(JSON.stringify(metadata)).not.toContain('app.moovx.ch')
  })

  it('keeps the Landing on the single marketing image helper', () => {
    const source = readFileSync('app/(marketing)/[locale]/landing/page.tsx', 'utf8')

    expect(source).toContain("const socialImage = buildMarketingSocialImage(t('ogImageAlt'))")
    expect(source).toContain('images: [socialImage]')
    expect(source.match(/images: \[socialImage\]/g)).toHaveLength(2)
    expect(source).not.toContain('app.moovx.ch')
  })

  it('keeps all marketing social metadata off the application domain', () => {
    const sources = [
      'app/components/layout/RootDocument.tsx',
      'app/(marketing)/[locale]/landing/page.tsx',
      'app/(marketing)/[locale]/blog/page.tsx',
      'app/(marketing)/[locale]/blog/[slug]/page.tsx',
      'app/(marketing)/[locale]/guides/[slug]/page.tsx',
      'public/guide-musculation.html',
      'public/guide-nutrition.html',
    ].map(path => readFileSync(path, 'utf8'))

    for (const source of sources) {
      const socialMetadata = source
        .split('\n')
        .filter(line => /openGraph|twitter|og:|twitter:/.test(line))
        .join('\n')
      expect(socialMetadata).not.toContain('app.moovx.ch')
    }
  })
})
