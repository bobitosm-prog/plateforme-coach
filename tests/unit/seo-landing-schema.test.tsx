import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import LandingLayout from '../../app/(marketing)/[locale]/landing/layout'
import StructuredData from '../../components/StructuredData'
import { buildLandingSchemaGraph } from '../../lib/structured-data'

const locales = ['fr', 'en', 'de'] as const
const landingPageSource = readFileSync('app/(marketing)/[locale]/landing/page.tsx', 'utf8')

type SchemaEntity = Record<string, unknown> & { '@id': string; '@type': string }

function graphEntities(): SchemaEntity[] {
  return buildLandingSchemaGraph()['@graph'] as SchemaEntity[]
}

function collectUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectUrls)
  if (!value || typeof value !== 'object') return []

  return Object.entries(value).flatMap(([key, child]) => {
    const own = (key === 'url' || key === '@id') && typeof child === 'string' ? [child] : []
    return [...own, ...collectUrls(child)]
  })
}

describe('Landing Schema.org graph', () => {
  it('renders exactly one JSON-LD script across the Landing boundaries', () => {
    const layout = renderToStaticMarkup(<LandingLayout><main>Landing</main></LandingLayout>)
    const schema = renderToStaticMarkup(<StructuredData data={buildLandingSchemaGraph()} />)

    expect(layout).not.toContain('application/ld+json')
    expect(schema.match(/type="application\/ld\+json"/g)).toHaveLength(1)
    expect(landingPageSource.match(/<StructuredData /g)).toHaveLength(1)
  })

  it('uses the same stable graph for the FR, EN and DE Landing routes', () => {
    const serializedByLocale = locales.map(() => JSON.stringify(buildLandingSchemaGraph()))

    expect(new Set(serializedByLocale)).toHaveProperty('size', 1)
  })

  it('contains exactly Organization, WebSite and WebApplication', () => {
    expect(graphEntities().map(entity => entity['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebApplication',
    ])
  })

  it('keeps every entity identity unique and every relation resolvable', () => {
    const entities = graphEntities()
    const ids = entities.map(entity => entity['@id'])

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([
      'https://moovx.ch/#organization',
      'https://moovx.ch/#website',
      'https://moovx.ch/#software',
    ])

    for (const entity of entities) {
      for (const relation of ['publisher', 'provider'] as const) {
        const reference = entity[relation]
        if (reference && typeof reference === 'object' && '@id' in reference) {
          expect(ids).toContain(reference['@id'])
        }
      }
    }
  })

  it('keeps all graph URLs on the marketing authority', () => {
    expect(collectUrls(buildLandingSchemaGraph())).not.toHaveLength(0)
    for (const url of collectUrls(buildLandingSchemaGraph())) {
      expect(url).toMatch(/^https:\/\/moovx\.ch(?:\/|$)/)
    }
  })

  it('uses the real 512x512 logo asset', async () => {
    const organization = graphEntities().find(entity => entity['@type'] === 'Organization')!
    const logo = organization.logo as Record<string, unknown>
    const image = await sharp('public/logo-moovx-512.png').metadata()

    expect(logo).toEqual({
      '@type': 'ImageObject',
      url: 'https://moovx.ch/logo-moovx-512.png',
      width: 512,
      height: 512,
    })
    expect(image).toMatchObject({ width: 512, height: 512 })
  })

  it('contains no unsupported local, rating, review, offer or exercise claims', () => {
    const serialized = JSON.stringify(buildLandingSchemaGraph())

    expect(serialized).not.toContain('HealthAndBeautyBusiness')
    expect(serialized).not.toContain('LocalBusiness')
    expect(serialized).not.toContain('AggregateRating')
    expect(serialized).not.toContain('Review')
    expect(serialized).not.toContain('Offer')
    expect(serialized).not.toContain('163')
    expect(serialized).not.toContain('182')
  })

  it('uses one verified public contact and no physical-address claims', () => {
    const serialized = JSON.stringify(buildLandingSchemaGraph())

    expect(serialized).toContain('contact@moovx.ch')
    expect(serialized).not.toContain('hello@moovx.ch')
    expect(serialized).not.toContain('PostalAddress')
    expect(serialized).not.toContain('GeoCoordinates')
    expect(serialized).not.toContain('legalName')
    expect(serialized).not.toContain('sameAs')
  })

  it('represents all Landing languages without changing the WebSite identity', () => {
    const website = graphEntities().find(entity => entity['@type'] === 'WebSite')!

    expect(website.inLanguage).toEqual(['fr-CH', 'en', 'de-CH'])
    expect(website['@id']).toBe('https://moovx.ch/#website')
  })

  it('describes the product strictly as a Web application', () => {
    const application = graphEntities().find(entity => entity['@type'] === 'WebApplication')!

    expect(application).toMatchObject({
      name: 'MoovX',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      publisher: { '@id': 'https://moovx.ch/#organization' },
      provider: { '@id': 'https://moovx.ch/#organization' },
    })
  })
})
