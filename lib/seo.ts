// lib/seo.ts
// Helper centralisé pour metadata SEO multilingue

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://moovx.ch';
export const LOCALES = ['fr', 'en', 'de'] as const;
export const DEFAULT_LOCALE = 'fr';
export type Locale = (typeof LOCALES)[number];

const OG_LOCALES: Record<Locale, string> = {
  fr: 'fr_CH',
  en: 'en_US',
  de: 'de_CH',
};

export function buildHreflangAlternates(path: string = '/landing') {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}/${l}${path}`;
  }
  languages['x-default'] = `${SITE_URL}/${DEFAULT_LOCALE}${path}`;
  return languages;
}

export function getOgLocale(locale: Locale): string {
  return OG_LOCALES[locale];
}

export function getAlternateOgLocales(currentLocale: Locale): string[] {
  return LOCALES.filter((l) => l !== currentLocale).map((l) => OG_LOCALES[l]);
}
