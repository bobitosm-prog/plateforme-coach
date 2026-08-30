'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildMealPlanParams } from '@/lib/meal-plan/build-generation-params'
import { buildProgramParams } from '@/lib/training/build-program-params'
import { updateProfile, invalidateProfileCache, type Profile } from '@/lib/profile-service'
import { cache } from '@/lib/cache'
import { consumeProgramStream } from '@/lib/training/consume-program-stream'
import { reportError } from '@/lib/client-error-reporter'
import type { UserCapabilities } from '@/lib/entitlements/capabilities'
import type { ActiveRelationLookupResult } from '@/lib/coach-relations/repository'
import {
  EMPTY_INITIAL_GENERATION_SNAPSHOT,
  InitialGenerationFailure,
  deriveInitialGenerationGlobalState,
  runInitialGenerationAttempt,
  type InitialGenerationDomain,
  type InitialGenerationDomainPort,
  type InitialGenerationGlobalState,
  type InitialGenerationSnapshot,
  type QuotaCheckResult,
  type ResourceReadResult,
} from '@/lib/initial-generation/engine'

interface InitialGenerationAuthority {
  capabilities: UserCapabilities
  coachRelationStatus: ActiveRelationLookupResult['kind']
  coachId: string | null
}

export interface UseInitialGenerationResult extends InitialGenerationSnapshot {
  globalState: InitialGenerationGlobalState
  generating: boolean
  visible: boolean
  retryTraining: () => void
  retryNutrition: () => void
  retryAll: () => void
}

type GeneratedProgram = {
  program_name?: string
  description?: string
  days: unknown[]
}

type InFlightRun = {
  promise: Promise<InitialGenerationSnapshot>
  domains: ReadonlySet<InitialGenerationDomain>
}

const inFlightByUser = new Map<string, InFlightRun>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidInitialProgram(value: unknown): value is GeneratedProgram {
  if (!isRecord(value) || !Array.isArray(value.days) || value.days.length === 0) return false
  return value.days.every(day => (
    isRecord(day)
    && Array.isArray(day.exercises)
    && day.exercises.length > 0
  ))
}

export function isValidInitialMealPlan(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const days = Object.values(value)
  return days.length >= 7 && days.every(day => (
    isRecord(day)
    && Array.isArray(day.meals)
    && day.meals.length > 0
  ))
}

async function consumeMealPlanStream(response: Response): Promise<unknown> {
  if (response.status === 429) throw new InitialGenerationFailure('quota_exhausted')
  if (!response.ok || !response.body) throw new InitialGenerationFailure('generation')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let plan: unknown = null
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event: unknown = JSON.parse(line.slice(6))
        if (isRecord(event) && event.type === 'done') plan = event.plan
        if (isRecord(event) && event.type === 'error') {
          throw new InitialGenerationFailure('generation')
        }
      } catch (error) {
        if (error instanceof InitialGenerationFailure) throw error
        // Malformed events are ignored; final payload validation is authoritative.
      }
    }
  }
  return plan
}

function classifyRead(
  result: { data: unknown; error: unknown },
  validate: (value: unknown) => boolean,
): ResourceReadResult {
  if (result.error) return { kind: 'error', reason: 'read' }
  if (!result.data) return { kind: 'missing' }
  return validate(result.data) ? { kind: 'ready' } : { kind: 'error', reason: 'read' }
}

async function withCrossTabLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return task()
  return navigator.locks.request(`moovx-initial-generation:${userId}`, task)
}

export default function useInitialGeneration(
  userId: string | null | undefined,
  profile: Profile | null | undefined,
  supabase: SupabaseClient,
  authority: InitialGenerationAuthority,
): UseInitialGenerationResult {
  const [snapshot, setSnapshot] = useState<InitialGenerationSnapshot>(EMPTY_INITIAL_GENERATION_SNAPSHOT)
  const snapshotRef = useRef(snapshot)
  const autoStartedForUserRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const queuedDomainsRef = useRef(new Set<InitialGenerationDomain>())

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => () => { mountedRef.current = false }, [])

  const execute = useCallback((domains: readonly InitialGenerationDomain[]) => {
    if (!userId || !profile || !profile.needs_initial_generation) return

    const relationUncertain = authority.coachRelationStatus === 'error'
      || authority.coachRelationStatus === 'multiple_active'
    const coachManaged = authority.coachRelationStatus === 'active' && Boolean(authority.coachId)

    const readTraining = async (): Promise<ResourceReadResult> => {
      if (relationUncertain) return { kind: 'error', reason: 'relation' }
      if (coachManaged) {
        const result = await supabase
          .from('client_programs')
          .select('id,program')
          .eq('client_id', userId)
          .eq('coach_id', authority.coachId as string)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return classifyRead(result, row => isRecord(row) && isRecord(row.program))
      }
      const result = await supabase
        .from('custom_programs')
        .select('id,days,is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return classifyRead(result, row => isRecord(row) && Array.isArray(row.days))
    }

    const readNutrition = async (): Promise<ResourceReadResult> => {
      if (relationUncertain) return { kind: 'error', reason: 'relation' }
      if (coachManaged) {
        const result = await supabase
          .from('client_meal_plans')
          .select('id,plan')
          .eq('client_id', userId)
          .eq('coach_id', authority.coachId as string)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return classifyRead(result, row => isRecord(row) && isRecord(row.plan))
      }
      const result = await supabase
        .from('meal_plans')
        .select('id,plan,active')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return classifyRead(result, row => isRecord(row) && isRecord(row.plan))
    }

    const persistTraining = async (payload: unknown): Promise<boolean> => {
      if (!isValidInitialProgram(payload)) return false
      // There is no unique active constraint. Insert active first so an old
      // active resource is never removed before its replacement is durable.
      const { data: inserted, error: insertError } = await supabase
        .from('custom_programs')
        .insert({
          user_id: userId,
          name: payload.program_name || 'Programme IA',
          description: payload.description || '',
          days: payload.days,
          source: 'onboarding_auto',
          is_active: true,
        })
        .select('id,created_at')
        .single()
      if (insertError || !inserted?.id || !inserted.created_at) return false

      const { error: deactivateError } = await supabase
        .from('custom_programs')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true)
        .lt('created_at', inserted.created_at)
        .neq('id', inserted.id)
      if (!deactivateError) return true

      const { error: rollbackError } = await supabase
        .from('custom_programs')
        .update({ is_active: false })
        .eq('id', inserted.id)
        .eq('user_id', userId)
      if (rollbackError) reportError('error', '[initial-generation] training rollback failed', { userId })
      return false
    }

    const persistNutrition = async (payload: unknown): Promise<boolean> => {
      if (!isValidInitialMealPlan(payload)) return false
      const { data: inserted, error: insertError } = await supabase
        .from('meal_plans')
        .insert({ user_id: userId, plan: payload, active: true })
        .select('id,created_at')
        .single()
      if (insertError || !inserted?.id || !inserted.created_at) return false

      const { error: deactivateError } = await supabase
        .from('meal_plans')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('active', true)
        .lt('created_at', inserted.created_at)
        .neq('id', inserted.id)
      if (!deactivateError) return true

      const { error: rollbackError } = await supabase
        .from('meal_plans')
        .update({ active: false })
        .eq('id', inserted.id)
        .eq('user_id', userId)
      if (rollbackError) reportError('error', '[initial-generation] nutrition rollback failed', { userId })
      return false
    }

    const checkQuota = async (): Promise<QuotaCheckResult> => {
      try {
        const response = await fetch('/api/ai-quota', { cache: 'no-store' })
        if (!response.ok) return 'error'
        const body: unknown = await response.json()
        if (!isRecord(body) || typeof body.remaining !== 'number') return 'error'
        return body.remaining > 0 ? 'available' : 'exhausted'
      } catch {
        return 'error'
      }
    }

    const ports: Record<InitialGenerationDomain, InitialGenerationDomainPort> = {
      training: {
        read: readTraining,
        generate: async () => {
          const response = await fetch('/api/generate-custom-program', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildProgramParams(profile)),
          })
          if (response.status === 429) throw new InitialGenerationFailure('quota_exhausted')
          return consumeProgramStream(response)
        },
        validate: isValidInitialProgram,
        persist: persistTraining,
        canGenerate: !coachManaged && authority.capabilities.ai && authority.capabilities.training,
        blockedReason: coachManaged ? 'coach_managed' : 'capability',
      },
      nutrition: {
        read: readNutrition,
        generate: async () => consumeMealPlanStream(await fetch('/api/generate-meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildMealPlanParams(profile)),
        })),
        validate: isValidInitialMealPlan,
        persist: persistNutrition,
        canGenerate: !coachManaged && authority.capabilities.ai && authority.capabilities.nutrition,
        blockedReason: coachManaged ? 'coach_managed' : 'capability',
      },
    }

    const clearFlag = async () => {
      const { data, error } = await updateProfile(userId, {
        needs_initial_generation: false,
        next_program_regen_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }, supabase)
      invalidateProfileCache()
      cache.remove(`dashboard_${userId}`)
      if (error || data?.needs_initial_generation !== false) {
        reportError('error', '[initial-generation] flag clear failed', { userId })
        return false
      }
      return true
    }

    const existing = inFlightByUser.get(userId)
    if (existing) {
      const uncovered = domains.filter(domain => !existing.domains.has(domain))
      uncovered.forEach(domain => queuedDomainsRef.current.add(domain))
      void existing.promise.then(next => {
        snapshotRef.current = next
        if (mountedRef.current) setSnapshot(next)
      })
      return
    }

    const run = withCrossTabLock(userId, () => runInitialGenerationAttempt({
      snapshot: snapshotRef.current,
      domains,
      ports,
      checkQuota,
      clearFlag,
      onChange: next => {
        snapshotRef.current = next
        if (mountedRef.current) setSnapshot(next)
      },
    }))
    inFlightByUser.set(userId, { promise: run, domains: new Set(domains) })
    void run.then(next => {
      if (inFlightByUser.get(userId)?.promise === run) inFlightByUser.delete(userId)
      snapshotRef.current = next
      if (mountedRef.current) setSnapshot(next)
    }, () => {
      if (inFlightByUser.get(userId)?.promise === run) inFlightByUser.delete(userId)
    })
  }, [authority, profile, supabase, userId])

  useEffect(() => {
    if (!userId || inFlightByUser.has(userId) || queuedDomainsRef.current.size === 0) return
    const queued = [...queuedDomainsRef.current]
    queuedDomainsRef.current.clear()
    const timer = window.setTimeout(() => execute(queued), 0)
    return () => window.clearTimeout(timer)
  }, [execute, snapshot, userId])

  useEffect(() => {
    mountedRef.current = true
    if (!userId || !profile?.needs_initial_generation) return
    if (autoStartedForUserRef.current === userId) return
    autoStartedForUserRef.current = userId
    const timer = window.setTimeout(() => execute(['training', 'nutrition']), 0)
    return () => window.clearTimeout(timer)
  }, [execute, profile?.needs_initial_generation, userId])

  const retryTraining = useCallback(() => execute(['training']), [execute])
  const retryNutrition = useCallback(() => execute(['nutrition']), [execute])
  const retryAll = useCallback(() => execute(['training', 'nutrition']), [execute])
  const globalState = deriveInitialGenerationGlobalState(snapshot)

  return {
    ...snapshot,
    globalState,
    generating: snapshot.training.phase === 'generating' || snapshot.nutrition.phase === 'generating',
    visible: Boolean(profile?.needs_initial_generation) && globalState !== 'ready' && globalState !== 'idle',
    retryTraining,
    retryNutrition,
    retryAll,
  }
}
