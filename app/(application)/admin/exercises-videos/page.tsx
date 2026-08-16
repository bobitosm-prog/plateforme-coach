'use client'
import { PageHeader } from '@/app/admin/_components/PageHeader'
import { SeedanceStudio } from '@/app/admin/exercises-videos/_components/SeedanceStudio'

export default function ExercisesVideosPage() {
  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Vidéos exercices"
        description="Générer les démonstrations manquantes via Seedance"
      />
      <SeedanceStudio />
    </div>
  )
}
