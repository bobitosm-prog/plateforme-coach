'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Dumbbell, Target, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { invalidateProfileCache } from '@/lib/profile-service'
import { cache } from '@/lib/cache'
import { diagnosticWeek } from '@/lib/weekly-diagnostic/week'
import { colors, fonts, btnPrimary } from '@/lib/design-tokens'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'
  if (score >= 60) return colors.gold
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function formatWeekRangeLong(weekStart: string, locale: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const loc = locale === 'fr' ? 'fr-CH' : locale === 'de' ? 'de-CH' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${start.toLocaleDateString(loc, opts)} → ${end.toLocaleDateString(loc, opts)}`
}

const sectionCard: React.CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.divider}`,
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
}

const sectionHeading: React.CSSProperties = {
  fontFamily: fonts.headline,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  marginBottom: 10,
}

export default function WeeklyDiagnosticDetailContent({ id }: { id: string }) {
  const t = useTranslations('weekly_diagnostic_detail')
  const at = useTranslations('weeklyAdjustment')
  const locale = useLocale()
  const router = useRouter()
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current

  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [raisonnementOpen, setRaisonnementOpen] = useState(false)
  const [regenMsg, setRegenMsg] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const { data, error } = await supabase
        .from('weekly_diagnostics')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (error || !data) {
        router.push('/')
        return
      }

      setDiagnostic(data)
      setApplied(!!data.applied_at)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApply() {
    if (!userId || !diagnostic || applying || applied) return
    setApplying(true)
    setRegenMsg(at('preparing'))
    try {
      const response = await fetch(`/api/weekly-diagnostic/${diagnostic.id}/apply`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        setRegenMsg(at(response.status === 409 ? 'changed' : response.status === 403 ? 'coach' : 'failed'))
        return
      }
      invalidateProfileCache()
      cache.remove(`dashboard_${userId}`)
      setDiagnostic((previous: typeof diagnostic) => ({ ...previous, applied_at: result.applied_at ?? new Date().toISOString() }))
      setApplied(true)
      setRegenMsg(at('success'))
    } catch {
      setRegenMsg(at('failed'))
    } finally {
      setApplying(false)
    }
  }

  // ─── Loading ───
  if (loading || !diagnostic) {
    return (
      <div style={{ minHeight: '100dvh', background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${colors.goldBorder}`, borderTop: `3px solid ${colors.gold}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const scoreColor = getScoreColor(diagnostic.score_semaine)
  const adj = diagnostic.ajustements || {}
  const applicable = diagnostic.policy_version === 2 && diagnostic.week_start === diagnosticWeek().weekStart
  const hasAdjustments = adj.calorie_goal_new || adj.protein_goal_new || adj.carbs_goal_new || adj.fat_goal_new || adj.training_volume_delta_pct
  const appliedDate = diagnostic.applied_at
    ? new Date(diagnostic.applied_at).toLocaleDateString(locale === 'fr' ? 'fr-CH' : locale === 'de' ? 'de-CH' : 'en-GB', { day: 'numeric', month: 'short' })
    : null

  const metrics = [
    { label: t('metric_adherence'), value: diagnostic.evidence?.planned_sessions_known === false ? at('unknown') : `${(diagnostic.adherence_pct || 0).toFixed(0)}%` },
    { label: t('metric_weight_delta'), value: diagnostic.evidence?.weight_known === false ? at('unknown') : `${diagnostic.weight_delta_kg > 0 ? '+' : ''}${(diagnostic.weight_delta_kg || 0).toFixed(1)} kg` },
    { label: t('metric_calories'), value: diagnostic.evidence?.nutrition_days === 0 ? at('unknown') : `${(diagnostic.calorie_avg_real || 0).toFixed(0)}` },
    { label: t('metric_protein_compliance'), value: diagnostic.evidence?.nutrition_days === 0 ? at('unknown') : `${(diagnostic.protein_compliance_pct || 0).toFixed(0)}%` },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: colors.background, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto' }}>
      {/* ─── Toast regen meal plan ─── */}
      {regenMsg && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: colors.background,
          border: `1px solid ${colors.goldBorder}`,
          color: colors.gold,
          padding: '12px 20px',
          borderRadius: 12,
          fontSize: 14,
          fontFamily: fonts.body,
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {regenMsg}
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', position: 'sticky', top: 0, background: colors.background, zIndex: 10 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={22} color={colors.text} />
        </button>
        <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.gold }}>
          {t('title')}
        </span>
      </div>

      <div style={{ padding: '0 20px 32px' }}>
        {/* ─── Score hero ─── */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginBottom: 16 }}>
            {formatWeekRangeLong(diagnostic.week_start, locale)}
          </p>
          <div style={{ width: 120, height: 120, borderRadius: '50%', border: `4px solid ${scoreColor}`, background: `${scoreColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <span style={{ fontFamily: fonts.headline, fontSize: 56, fontWeight: 800, color: scoreColor }}>
              {diagnostic.score_semaine}
            </span>
          </div>
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textDim, marginTop: 6 }}>/100</p>
        </motion.div>

        {/* ─── Metrics grid ─── */}
        <div style={{ ...sectionHeading, color: colors.gold }}>{t('metrics_heading')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ ...sectionCard, marginBottom: 0, textAlign: 'center' }}>
              <p style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>
                {m.value}
              </p>
              <p style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* ─── Points forts ─── */}
        {diagnostic.points_forts?.length > 0 && (
          <div style={sectionCard}>
            <div style={{ ...sectionHeading, color: '#10B981' }}>{t('points_forts_heading')}</div>
            {diagnostic.points_forts.map((p: string, i: number) => (
              <p key={i} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, margin: '4px 0', lineHeight: 1.5 }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* ─── Points alerte ─── */}
        {diagnostic.points_alerte?.length > 0 && (
          <div style={sectionCard}>
            <div style={{ ...sectionHeading, color: '#F59E0B' }}>{t('points_alerte_heading')}</div>
            {diagnostic.points_alerte.map((p: string, i: number) => (
              <p key={i} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, margin: '4px 0', lineHeight: 1.5 }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* ─── Ajustements ─── */}
        <div style={sectionCard}>
          <div style={{ ...sectionHeading, color: colors.gold }}>{t('adjustments_heading')}</div>
          {hasAdjustments ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {adj.calorie_goal_new && (
                <AdjRow label="Calories" current={diagnostic.calorie_avg_target} next={adj.calorie_goal_new} unit="kcal" />
              )}
              {adj.protein_goal_new && (
                <AdjRow label={at('proteinTarget')} current={diagnostic.evidence?.protein_target ?? null} next={adj.protein_goal_new} unit="g" />
              )}
              {adj.carbs_goal_new && (
                <AdjRow label="Carbs" current={null} next={adj.carbs_goal_new} unit="g" />
              )}
              {adj.fat_goal_new && (
                <AdjRow label="Fat" current={null} next={adj.fat_goal_new} unit="g" />
              )}
              {adj.training_volume_delta_pct && (
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
                  {diagnostic.adjustment_preview?.setsBefore != null
                    ? at('sets', { before: diagnostic.adjustment_preview.setsBefore, after: diagnostic.adjustment_preview.setsAfter, percent: diagnostic.adjustment_preview.actualPct })
                    : at('legacyVolume', { percent: adj.training_volume_delta_pct })}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              {t('adjustments_none')}
            </p>
          )}
          {hasAdjustments && !applicable && !applied && <p role="status">{at('expired')}</p>}
          {hasAdjustments && applicable && !applied && <p>{at('preserve')}</p>}
          {diagnostic.adjustment_preview?.effectiveWeekStart && <p>{at('effectiveWeek', { date: diagnostic.adjustment_preview.effectiveWeekStart })}</p>}
          {diagnostic.evidence && <p>{at('coverage', { logged: diagnostic.evidence.nutrition_days, complete: diagnostic.evidence.complete_nutrition_days, weights: diagnostic.evidence.weight_measurements })}</p>}
          {hasAdjustments && (
            <button
              onClick={handleApply}
              disabled={applied || applying || !applicable}
              style={{
                ...btnPrimary,
                width: '100%',
                padding: '13px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: applied || applying || !applicable ? 0.5 : 1,
              }}
            >
              {applied ? (
                <>{t('already_applied', { date: appliedDate || '' })}</>
              ) : applying ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('apply_loading')}</>
              ) : (
                <><Check size={16} /> {t('apply_button')}</>
              )}
            </button>
          )}
        </div>

        {/* ─── Exercice à ajouter ─── */}
        {diagnostic.exercice_a_ajouter && (
          <div style={{ ...sectionCard, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Dumbbell size={20} color={colors.gold} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ ...sectionHeading, color: colors.gold, marginBottom: 4 }}>{t('exercise_to_add')}</div>
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                {diagnostic.exercice_a_ajouter}
              </p>
            </div>
          </div>
        )}

        {/* ─── Objectif semaine prochaine ─── */}
        {diagnostic.objectif_semaine_prochaine && (
          <div style={{ ...sectionCard, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Target size={20} color={colors.gold} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ ...sectionHeading, color: colors.gold, marginBottom: 4 }}>{t('next_week_objective')}</div>
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                {diagnostic.objectif_semaine_prochaine}
              </p>
            </div>
          </div>
        )}

        {/* ─── Raisonnement IA (collapsible) ─── */}
        {diagnostic.raisonnement && (
          <div style={sectionCard}>
            <button
              onClick={() => setRaisonnementOpen(!raisonnementOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 0 }}
            >
              <span style={{ ...sectionHeading, color: colors.textDim, marginBottom: 0 }}>{t('ai_reasoning')}</span>
              {raisonnementOpen ? <ChevronUp size={16} color={colors.textDim} /> : <ChevronDown size={16} color={colors.textDim} />}
            </button>
            <AnimatePresence>
              {raisonnementOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, fontStyle: 'italic', lineHeight: 1.6, marginTop: 10 }}>
                    {diagnostic.raisonnement}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>
            {t('ai_footer')}
          </p>
          {diagnostic.ai_tokens_used > 0 && (
            <p style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, opacity: 0.6 }}>
              {t('tokens_used')}: {diagnostic.ai_tokens_used}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Adjustment row sub-component ───
function AdjRow({ label, current, next, unit }: { label: string; current: number | null; next: number; unit: string }) {
  const delta = current ? next - Math.round(current) : null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>{label}</span>
      <span style={{ fontFamily: fonts.headline, fontSize: 14, color: colors.text }}>
        {current ? `${Math.round(current)} → ` : ''}{next} {unit}
        {delta !== null && delta !== 0 && (
          <span style={{ fontSize: 11, color: delta > 0 ? '#10B981' : '#F59E0B', marginLeft: 4 }}>
            ({delta > 0 ? '+' : ''}{delta})
          </span>
        )}
      </span>
    </div>
  )
}
