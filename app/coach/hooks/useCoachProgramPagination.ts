'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createTrainingProgramRepository, type CoachProgramRow } from '@/lib/repositories/training'
import { mergeCoachProgramPage } from '@/lib/coaching/dashboard/program-pages'
import type { DatabaseClient } from '@/lib/supabase/types'

const PAGE_SIZE = 20

export function useCoachProgramPagination(client: DatabaseClient, coachId: string | undefined) {
  const repository = useMemo(() => createTrainingProgramRepository(client), [client])
  const [items, setItems] = useState<readonly CoachProgramRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialError, setInitialError] = useState(false)
  const [nextPageError, setNextPageError] = useState(false)
  const generation = useRef(0)
  const inFlight = useRef(false)
  const itemsRef = useRef<readonly CoachProgramRow[]>([])
  const cursorRef = useRef<string | null>(null)

  const load = useCallback(async (mode: 'reset' | 'next', exhaust = false) => {
    if (!coachId || (mode === 'next' && inFlight.current)) return
    const requestGeneration = mode === 'reset' ? ++generation.current : generation.current
    inFlight.current = true
    if (mode === 'reset') { setLoading(true); setInitialError(false); setNextPageError(false) }
    else { setLoadingMore(true); setNextPageError(false) }
    let cursor = mode === 'reset' ? undefined : cursorRef.current ?? undefined
    let accumulated: readonly CoachProgramRow[] = mode === 'reset' ? [] : itemsRef.current
    try {
      do {
        const result = await repository.listCoachProgramPage(coachId, { cursor, limit: PAGE_SIZE })
        if (requestGeneration !== generation.current) return
        if (!result.ok) {
          if (accumulated.length === 0) setInitialError(true)
          else setNextPageError(true)
          return
        }
        accumulated = mergeCoachProgramPage(accumulated, result.data)
        itemsRef.current = accumulated
        cursorRef.current = result.data.nextCursor
        setItems(accumulated)
        setHasMore(result.data.hasMore)
        cursor = result.data.nextCursor ?? undefined
        if (!result.data.hasMore) break
      } while (exhaust)
    } finally {
      if (requestGeneration === generation.current) {
        setLoading(false); setLoadingMore(false); inFlight.current = false
      }
    }
  }, [coachId, repository])

  useEffect(() => {
    if (!coachId) {
      generation.current += 1
      itemsRef.current = []
      cursorRef.current = null
      setItems([]); setHasMore(false); setLoading(false)
      return
    }
    void load('reset')
    return () => { generation.current += 1; inFlight.current = false }
  }, [coachId, load])

  const loadMore = useCallback(() => load('next'), [load])
  const retry = useCallback(() => load(nextPageError ? 'next' : 'reset'), [load, nextPageError])
  const reload = useCallback((exhaust = false) => load('reset', exhaust), [load])

  return {
    items, hasMore, loading, loadingMore, initialError, nextPageError,
    loadMore, retry, reload,
  }
}
