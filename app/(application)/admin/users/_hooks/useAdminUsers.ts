'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import type { AdminUserRow } from '@/lib/admin/types'

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  const reqIdRef = useRef(0)

  const fetchUsers = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (roleFilter) params.set('role', roleFilter)
      params.set('limit', '500')

      const data = await adminFetch<{ users: AdminUserRow[]; count: number }>(
        `/api/admin/users?${params.toString()}`
      )

      // Anti-race : ignore réponses obsolètes
      if (myId !== reqIdRef.current) return
      setUsers(data.users)
    } catch (e) {
      if (myId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [search, roleFilter])

  // Debounce search 200ms
  useEffect(() => {
    const t = setTimeout(() => { fetchUsers() }, 200)
    return () => clearTimeout(t)
  }, [fetchUsers])

  // Mise à jour optimiste d'une ligne (utilisée après PATCH)
  const updateUserLocally = useCallback((id: string, patch: Partial<AdminUserRow>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
  }, [])

  return {
    users,
    loading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    refresh: fetchUsers,
    updateUserLocally,
  }
}
