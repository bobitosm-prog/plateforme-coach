import RootDocument, { rootMetadata } from '@/app/components/layout/RootDocument'

export const metadata = rootMetadata

export default function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument lang="fr">{children}</RootDocument>
}
