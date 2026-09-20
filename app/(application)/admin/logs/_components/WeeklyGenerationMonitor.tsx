'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
type Snapshot = { stale: boolean; counts: Record<string, number>; runs: { id: string; started_at: string; finished_at: string | null; status: string; errors: number }[] }
export function WeeklyGenerationMonitor() {
  const [data,setData] = useState<Snapshot | null>(null)
  const [error,setError] = useState(false)
  const refresh = useCallback(async () => {
    try { setData(await adminFetch<Snapshot>('/api/admin/weekly-generations')); setError(false) }
    catch { setError(true) }
  }, [])
  useEffect(() => {
    const initial=setTimeout(() => { void refresh() },0)
    const timer=setInterval(() => { void refresh() },60000)
    return () => { clearTimeout(initial); clearInterval(timer) }
  }, [refresh])
  return <section className="admin-card mb-4" style={{ padding: 20 }} aria-label="Supervision des bilans automatiques">
    <h2>Générations automatiques — bilans hebdomadaires</h2>
    <p role="status">{error ? 'Supervision indisponible : aucun état fiable.' : !data ? 'Chargement…' : data.stale ? 'Alerte : aucun passage récent du planificateur.' : data.counts.failed || data.counts.retrying || data.runs[0]?.errors ? 'Attention : des générations ont échoué.' : 'Planificateur actif.'}</p>
    {data && <>
      <p>En attente : {data.counts.pending} · En cours : {data.counts.running} · Réussies : {data.counts.succeeded} · À reconfirmer : {data.counts.blocked} · Échecs définitifs : {data.counts.failed}</p>
      <p>Nouvelles tentatives après échec : {data.counts.retrying ?? 0}</p>
      <p>Dernier passage : {data.runs[0] ? new Date(data.runs[0].started_at).toLocaleString('fr-CH') : 'aucun'}. Trois tentatives maximum ; aucune modification automatique des plans.</p>
    </>}
    <button type="button" onClick={() => void refresh()}>Actualiser la supervision</button>
  </section>
}
