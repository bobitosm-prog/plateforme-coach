const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MoovX',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Plateforme de coaching fitness Swiss Made. Plans nutrition personnalisés, programme musculation PPL, 163 exercices guidés.',
  url: 'https://moovx.ch',
  offers: {
    '@type': 'Offer',
    price: '10',
    priceCurrency: 'CHF',
    availability: 'https://schema.org/InStock',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
