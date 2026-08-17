'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '../_components/PageHeader'
import { CampaignsTable } from './_components/CampaignsTable'
import { CampaignDialog } from './_components/CampaignDialog'
import { useCampaigns, type Campaign } from './_hooks/useCampaigns'

export default function AdminCampaignsPage() {
  const { campaigns, loading, error, createCampaign, updateCampaign, toggleActive } = useCampaigns()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<Campaign | null>(null)

  const handleNew = () => {
    setSelected(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleEdit = (c: Campaign) => {
    setSelected(c)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    if (isActive) {
      const ok = window.confirm(
        'Cette campagne deviendra visible publiquement sur le site (badge Hero, CTA, compteur places). Activer ?'
      )
      if (!ok) return
    }
    try {
      await toggleActive(id, isActive)
      toast.success(isActive ? 'Campagne activee' : 'Campagne desactivee')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const handleSubmit = async (values: { name: string; free_days: number; max_slots: number }) => {
    if (dialogMode === 'create') {
      await createCampaign(values)
      toast.success('Campagne creee')
    } else if (selected) {
      await updateCampaign(selected.id, values)
      toast.success('Campagne mise a jour')
    }
  }

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Campagnes"
        description="Gestion des campagnes beta (offre gratuite limitee)"
      />
      <CampaignsTable
        campaigns={campaigns}
        loading={loading}
        error={error}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onNew={handleNew}
      />
      <CampaignDialog
        open={dialogOpen}
        mode={dialogMode}
        campaign={selected}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
