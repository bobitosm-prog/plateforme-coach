// lib/structured-data.ts
// Helpers JSON-LD typés pour schema.org markup

import { SITE_URL } from './seo';

const MOOVX_BUSINESS = {
  legalName: 'MoovX SA',
  brandName: 'MoovX',
  logo: `${SITE_URL}/logo-moovx.png`,
  description: 'Plateforme de coaching personnalisée Swiss Made. Programmes sur mesure, Athena coach IA 24/7, suivi humain par experts certifiés.',
  address: {
    addressLocality: 'Genève',
    addressRegion: 'GE',
    postalCode: '1200',
    addressCountry: 'CH',
  },
  geo: {
    latitude: 46.2044,
    longitude: 6.1432,
  },
  email: 'hello@moovx.ch',
  sameAs: [] as string[],
  foundingDate: '2024',
  areaServed: ['CH', 'FR', 'DE'],
} as const;

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: MOOVX_BUSINESS.brandName,
    legalName: MOOVX_BUSINESS.legalName,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: MOOVX_BUSINESS.logo,
      width: 512,
      height: 512,
    },
    description: MOOVX_BUSINESS.description,
    foundingDate: MOOVX_BUSINESS.foundingDate,
    email: MOOVX_BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      ...MOOVX_BUSINESS.address,
    },
    ...(MOOVX_BUSINESS.sameAs.length > 0 && { sameAs: MOOVX_BUSINESS.sameAs }),
  };
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: MOOVX_BUSINESS.brandName,
    image: MOOVX_BUSINESS.logo,
    url: SITE_URL,
    email: MOOVX_BUSINESS.email,
    priceRange: 'CHF 10-150',
    address: {
      '@type': 'PostalAddress',
      ...MOOVX_BUSINESS.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: MOOVX_BUSINESS.geo.latitude,
      longitude: MOOVX_BUSINESS.geo.longitude,
    },
    areaServed: MOOVX_BUSINESS.areaServed.map((country) => ({
      '@type': 'Country',
      name: country,
    })),
    parentOrganization: {
      '@id': `${SITE_URL}/#organization`,
    },
  };
}

export function buildWebSiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: MOOVX_BUSINESS.brandName,
    description: MOOVX_BUSINESS.description,
    inLanguage: locale,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  };
}

export function buildSchemaGraph(schemas: Array<Record<string, unknown>>) {
  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map((s) => {
      const { '@context': _ctx, ...rest } = s;
      return rest;
    }),
  };
}
