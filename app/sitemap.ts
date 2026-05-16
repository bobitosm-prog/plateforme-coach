// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL, LOCALES, DEFAULT_LOCALE } from '@/lib/seo';

const PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/landing', priority: 1.0, changeFrequency: 'weekly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const page of PAGES) {
    for (const locale of LOCALES) {
      const languages: Record<string, string> = {};
      for (const l of LOCALES) {
        languages[l] = `${SITE_URL}/${l}${page.path}`;
      }
      languages['x-default'] = `${SITE_URL}/${DEFAULT_LOCALE}${page.path}`;

      entries.push({
        url: `${SITE_URL}/${locale}${page.path}`,
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
