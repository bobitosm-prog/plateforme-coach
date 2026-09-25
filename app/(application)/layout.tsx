import RootDocument, { rootMetadata, rootViewport } from '@/app/components/layout/RootDocument'

export const metadata = rootMetadata
export const viewport = rootViewport

export default function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument lang="fr">{children}</RootDocument>
}
