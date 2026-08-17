// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL, LOCALES, DEFAULT_LOCALE } from '@/lib/seo';
import { getAllPosts } from '@/content/blog/posts';
import { getAllGuides } from '@/content/guides/guides';
import { LEGAL_DOCUMENT_METADATA } from '@/content/legal/metadata';

interface SitemapPage {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  lastModified?: string;
}

const posts = getAllPosts();
const blogLastModified = posts.reduce<string | undefined>((latest, post) => {
  const effectiveDate = post.dateModified ?? post.date;
  return !latest || effectiveDate > latest ? effectiveDate : latest;
}, undefined);

const PAGES: SitemapPage[] = [
  { path: '/landing', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly', lastModified: blogLastModified },
  ...posts.map((post) => ({
    path: `/blog/${post.slug}`,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
    lastModified: post.dateModified ?? post.date,
  })),
  {
    path: '/privacy',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: LEGAL_DOCUMENT_METADATA.privacy.lastModified,
  },
  {
    path: '/cgu',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: LEGAL_DOCUMENT_METADATA.cgu.lastModified,
  },
];

const FRENCH_ONLY_PAGES: SitemapPage[] = [
  ...getAllGuides().map((guide) => ({
    path: `/guides/${guide.slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: guide.dateModified,
  })),
  {
    path: '/outils/calculateur-calories-macros',
    priority: 0.9,
    changeFrequency: 'monthly',
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
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
        ...(page.lastModified && { lastModified: page.lastModified }),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      });
    }
  }

  for (const page of FRENCH_ONLY_PAGES) {
    const url = `${SITE_URL}/fr${page.path}`;
    entries.push({
      url,
      ...(page.lastModified && { lastModified: page.lastModified }),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          fr: url,
          'x-default': url,
        },
      },
    });
  }

  return entries;
}
