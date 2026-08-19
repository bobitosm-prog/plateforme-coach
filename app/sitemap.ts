// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL, LOCALES, DEFAULT_LOCALE } from '@/lib/seo';
import { getAllPosts } from '@/content/blog/posts';
import { GUIDE_SLUGS } from '@/content/guides/guides';

const PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/landing', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  ...getAllPosts().map((post) => ({
    path: `/blog/${post.slug}`,
    priority: 0.7 as number,
    changeFrequency: 'monthly' as const,
  })),
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cgu', priority: 0.3, changeFrequency: 'yearly' },
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

  for (const slug of GUIDE_SLUGS) {
    const url = `${SITE_URL}/fr/guides/${slug}`;
    entries.push({
      url,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          fr: url,
          'x-default': url,
        },
      },
    });
  }

  const calculatorUrl = `${SITE_URL}/fr/outils/calculateur-calories-macros`;
  entries.push({
    url: calculatorUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: calculatorUrl,
        'x-default': calculatorUrl,
      },
    },
  });

  const bulkGainUrl = `${SITE_URL}/fr/nutrition/prise-de-masse`;
  entries.push({
    url: bulkGainUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: bulkGainUrl,
        'x-default': bulkGainUrl,
      },
    },
  });

  const weightLossUrl = `${SITE_URL}/fr/nutrition/perte-de-poids`;
  entries.push({
    url: weightLossUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: weightLossUrl,
        'x-default': weightLossUrl,
      },
    },
  });

  const dailyProteinUrl = `${SITE_URL}/fr/nutrition/proteines-par-jour`;
  entries.push({
    url: dailyProteinUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: dailyProteinUrl,
        'x-default': dailyProteinUrl,
      },
    },
  });

  const beginnerProgramUrl = `${SITE_URL}/fr/programmes/musculation/debutant`;
  entries.push({
    url: beginnerProgramUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: beginnerProgramUrl,
        'x-default': beginnerProgramUrl,
      },
    },
  });

  const aiCoachUrl = `${SITE_URL}/fr/coach-sportif-ia`;
  entries.push({
    url: aiCoachUrl,
    changeFrequency: 'monthly',
    priority: 0.9,
    alternates: {
      languages: {
        fr: aiCoachUrl,
        'x-default': aiCoachUrl,
      },
    },
  });

  return entries;
}
