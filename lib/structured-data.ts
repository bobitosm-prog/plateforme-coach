// lib/structured-data.ts
// Stable, source-controlled JSON-LD entities for the multilingual marketing site.

const MARKETING_URL = 'https://moovx.ch';
const ORGANIZATION_ID = `${MARKETING_URL}/#organization`;

const MOOVX_ORGANIZATION = {
  name: 'MoovX',
  logo: `${MARKETING_URL}/logo-moovx-512.png`,
  email: 'contact@moovx.ch',
} as const;

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: MOOVX_ORGANIZATION.name,
    url: MARKETING_URL,
    logo: {
      '@type': 'ImageObject',
      url: MOOVX_ORGANIZATION.logo,
      width: 512,
      height: 512,
    },
    email: MOOVX_ORGANIZATION.email,
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${MARKETING_URL}/#website`,
    url: MARKETING_URL,
    name: MOOVX_ORGANIZATION.name,
    inLanguage: ['fr-CH', 'en', 'de-CH'],
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function buildWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${MARKETING_URL}/#software`,
    name: MOOVX_ORGANIZATION.name,
    url: MARKETING_URL,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    publisher: { '@id': ORGANIZATION_ID },
    provider: { '@id': ORGANIZATION_ID },
  };
}

export function buildSchemaGraph(schemas: Array<Record<string, unknown>>) {
  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map((s) => {
      const rest = { ...s };
      delete rest['@context'];
      return rest;
    }),
  };
}

export function buildLandingSchemaGraph() {
  return buildSchemaGraph([
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildWebApplicationSchema(),
  ]);
}
