'use client'

import { useEffect, useRef, useState } from 'react'
import { buildMealPlanParams } from '@/lib/meal-plan/build-generation-params'
import { buildProgramParams } from '@/lib/training/build-program-params'
import { updateProfile, invalidateProfileCache, type Profile } from '@/lib/profile-service'
import { cache } from '@/lib/cache'

/**
 * Generation step for UI progress display.
 */
export type GenerationStep = 'idle' | 'meal' | 'program' | 'done' | 'error'

interface UseInitialGenerationResult {
  /** Current generation step (drives the progress banner) */
  step: GenerationStep
  /** True while any generation is in flight */
  generating: boolean
}

/**
 * Auto-generates the initial meal plan + training program when a freshly
 * onboarded user lands on the home with needs_initial_generation = true.
 *
 * Sequence:
 *   1. Generate meal plan (SSE) → insert meal_plans
 *   2. Generate training program (JSON) → insert custom_programs
 *   3. Set needs_initial_generation = false
 *
 * Robust: runs once per mount (guarded by ref). If a generation fails,
 * the flag stays true so it retries on next home load. Best-effort:
 * a meal failure does not block the program generation attempt.
 *
 * @param userId  Current user id (null until session resolved)
 * @param profile Current profile (null until loaded). Must contain the flag.
 * @param supabase Supabase browser client from the dashboard hook.
 */
export default function useInitialGeneration(
  userId: string | null | undefined,
  profile: Profile | null | undefined,
  supabase: any,
): UseInitialGenerationResult {
  const [step, setStep] = useState<GenerationStep>('idle')
  const startedRef = useRef(false)

  useEffect(() => {
    // Guards : need everything resolved + flag true + not already started
    if (!userId || !profile || !supabase) return
    if (!profile.needs_initial_generation) return
    if (startedRef.current) return

    startedRef.current = true

    let cancelled = false

    async function run() {
      let mealOk = false
      let programOk = false

      // ── Step 1 : meal plan (SSE) ──
      try {
        setStep('meal')
        const mealParams = buildMealPlanParams(profile as Profile)
        const res = await fetch('/api/generate-meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mealParams),
        })
        if (res.ok && res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let planData: any = null
          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.type === 'done') planData = parsed.plan
              } catch {
                // ignore partial JSON chunks
              }
            }
          }
          if (planData && !cancelled) {
            await supabase.from('meal_plans').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)
            await supabase.from('meal_plans').insert({
              user_id: userId,
              plan_data: planData,
              is_active: true,
            })
            mealOk = true
          }
        }
      } catch (e) {
        console.error('[useInitialGeneration] meal plan error:', e)
        // best-effort : continue to program even if meal failed
      }

      if (cancelled) return

      // ── Step 2 : training program (JSON) ──
      try {
        setStep('program')
        const programParams = buildProgramParams(profile as Profile)
        const res = await fetch('/api/generate-custom-program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(programParams),
        })
        const data = await res.json()
        if (data.program && !cancelled) {
          // Deactivate old programs first (consistency with meal plan pattern)
          await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)
          await supabase.from('custom_programs').insert({
            user_id: userId,
            name: data.program.program_name || 'Programme IA',
            description: data.program.description || '',
            days: data.program.days || [],
            source: 'onboarding_auto',
            is_active: true,
          })
          programOk = true
        }
      } catch (e) {
        console.error('[useInitialGeneration] program error:', e)
      }

      if (cancelled) return

      // ── Step 3 : clear flag ONLY if both generations succeeded ──
      // If either failed, the flag stays true so the next home load retries.
      if (mealOk && programOk) {
        try {
          await updateProfile(userId as string, { needs_initial_generation: false }, supabase)
          invalidateProfileCache()
          cache.remove(`dashboard_${userId}`)
        } catch (e) {
          console.error('[useInitialGeneration] flag clear error:', e)
        }
        if (!cancelled) setStep('done')
      } else {
        // Partial or total failure : keep flag true for retry, surface error state
        console.error('[useInitialGeneration] incomplete generation — meal:', mealOk, 'program:', programOk, '— flag kept true for retry')
        // Invalidate caches anyway so any successful insert is reflected
        invalidateProfileCache()
        cache.remove(`dashboard_${userId}`)
        if (!cancelled) setStep('error')
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [userId, profile, supabase])

  return {
    step,
    generating: step === 'meal' || step === 'program',
  }
}
