'use client'

import { useEffect, useRef, useState } from 'react'
import { buildMealPlanParams } from '@/lib/meal-plan/build-generation-params'
import { buildProgramParams } from '@/lib/training/build-program-params'
import { updateProfile, invalidateProfileCache, type Profile } from '@/lib/profile-service'
import { cache } from '@/lib/cache'
import { consumeProgramStream } from '@/lib/training/consume-program-stream'
import { reportError } from '@/lib/client-error-reporter'

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
 * Guards:
 *   - Checks for existing active meal-plan + program BEFORE generating
 *     (prevents duplicate generation if flag was not cleared)
 *   - Only generates what is missing (meal, program, or both)
 *   - Flag clear runs UNCONDITIONALLY after successful generation
 *     (cancelled only gates UI setState, never the DB write)
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
      // ── Step 0 : check existing data (prevents duplicate generation) ──
      let hasMeal = false
      let hasProgram = false
      try {
        const { data: existingMeal } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
        hasMeal = (existingMeal?.length ?? 0) > 0

        const { data: existingProg } = await supabase
          .from('custom_programs')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
        hasProgram = (existingProg?.length ?? 0) > 0
      } catch (e) {
        console.error('[useInitialGeneration] existence check error:', e)
        // Continue — generate both as fallback
      }

      // If both already exist, clear the flag and return (no generation needed)
      if (hasMeal && hasProgram) {
        await clearFlag(userId as string)
        if (!cancelled) setStep('done')
        return
      }

      let mealOk = hasMeal
      let programOk = hasProgram

      // ── Step 1 : meal plan (SSE) — only if missing ──
      if (!hasMeal) {
        try {
          if (!cancelled) setStep('meal')
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
            if (planData) {
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
      }

      // ── Step 2 : training program (JSON) — only if missing ──
      if (!hasProgram) {
        try {
          if (!cancelled) setStep('program')
          const programParams = buildProgramParams(profile as Profile)
          const res = await fetch('/api/generate-custom-program', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programParams),
          })
          const program = await consumeProgramStream(res)
          if (program) {
            await supabase.from('custom_programs').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)
            await supabase.from('custom_programs').insert({
              user_id: userId,
              name: program.program_name || 'Programme IA',
              description: program.description || '',
              days: program.days || [],
              source: 'onboarding_auto',
              is_active: true,
            })
            programOk = true
          }
        } catch (e) {
          console.error('[useInitialGeneration] program error:', e)
        }
      }

      // ── Step 3 : clear flag — UNCONDITIONAL if both OK ──
      // cancelled only gates UI setState, NEVER the DB write (fix boucle infinie 06/07)
      if (mealOk && programOk) {
        await clearFlag(userId as string)
        if (!cancelled) setStep('done')
      } else {
        console.error('[useInitialGeneration] incomplete generation — meal:', mealOk, 'program:', programOk, '— flag kept true for retry')
        invalidateProfileCache()
        cache.remove(`dashboard_${userId}`)
        if (!cancelled) setStep('error')
      }
    }

    async function clearFlag(uid: string) {
      const { error } = await updateProfile(uid, {
        needs_initial_generation: false,
        next_program_regen_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }, supabase)
      if (error) {
        reportError('error', '[initial-generation] flag clear failed', {
          userId: uid,
          error: typeof error === 'string' ? error : error?.message || JSON.stringify(error),
        })
      }
      invalidateProfileCache()
      cache.remove(`dashboard_${uid}`)
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
