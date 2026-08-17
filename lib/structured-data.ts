const MOOVX_URL = 'https://moovx.ch'
const ORGANIZATION_ID = `${MOOVX_URL}/#organization`

export function buildLandingSchemaGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'MoovX',
        url: MOOVX_URL,
        logo: `${MOOVX_URL}/logo-moovx-512.png`,
        email: 'contact@moovx.ch',
      },
      {
        '@type': 'WebSite',
        '@id': `${MOOVX_URL}/#website`,
        url: MOOVX_URL,
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: ['fr', 'en', 'de'],
      },
      {
        '@type': 'WebApplication',
        '@id': `${MOOVX_URL}/#software`,
        name: 'MoovX',
        url: MOOVX_URL,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web',
        publisher: { '@id': ORGANIZATION_ID },
        provider: { '@id': ORGANIZATION_ID },
      },
    ],
  }
}
