'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import type { InitialGenerationDomainState } from '@/lib/initial-generation/engine'
import type { UseInitialGenerationResult } from '@/app/hooks/useInitialGeneration'
import { BG_CARD, BORDER, FONT_BODY, GOLD, GREEN, RED, TEXT_MUTED, TEXT_PRIMARY, Z_TOAST } from '@/lib/design-tokens'

function DomainRow({
  label,
  state,
  retry,
}: {
  label: string
  state: InitialGenerationDomainState
  retry: () => void
}) {
  const t = useTranslations('initialGeneration')
  const working = state.phase === 'checking' || state.phase === 'generating'
  const failed = state.phase === 'error'
  const waitingForCoach = state.phase === 'missing' && state.reason === 'coach_managed'
  const canRetry = failed || state.phase === 'missing'
  const statusKey = state.phase === 'ready'
    ? 'ready'
    : working
      ? 'generating'
      : waitingForCoach
        ? 'waitingForCoach'
        : state.reason === 'quota_exhausted'
          ? 'quotaExhausted'
          : state.phase === 'missing'
            ? 'missing'
            : 'error'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
      {state.phase === 'ready' ? <CheckCircle2 size={17} color={GREEN} aria-hidden /> : null}
      {working ? <LoaderCircle className="initial-generation-spinner" size={17} color={GOLD} aria-hidden /> : null}
      {(failed || state.phase === 'missing') ? <CircleAlert size={17} color={failed ? RED : GOLD} aria-hidden /> : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', color: TEXT_PRIMARY, fontSize: 13 }}>{label}</strong>
        <span role={failed ? 'alert' : undefined} style={{ color: failed ? RED : TEXT_MUTED, fontSize: 12 }}>{t(`status.${statusKey}`)}</span>
      </span>
      {canRetry && (
        <button
          type="button"
          onClick={retry}
          aria-label={t('retryDomain', { domain: label })}
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 700 }}
        >
          <RefreshCw size={15} aria-hidden />
          <span className="initial-generation-retry-label">{t('retry')}</span>
        </button>
      )}
    </div>
  )
}

export default function InitialGenerationStatus({ generation }: { generation: UseInitialGenerationResult }) {
  const t = useTranslations('initialGeneration')
  if (!generation.visible) return null

  return (
    <aside
      aria-label={t('title')}
      aria-live={generation.globalState === 'error' ? 'assertive' : 'polite'}
      style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: Z_TOAST, width: 'min(calc(100% - 24px), 440px)', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', padding: '12px 14px', fontFamily: FONT_BODY }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Sparkles size={17} color={GOLD} aria-hidden />
        <strong style={{ color: TEXT_PRIMARY, fontSize: 13 }}>{t('title')}</strong>
      </div>
      <DomainRow label={t('training')} state={generation.training} retry={generation.retryTraining} />
      <DomainRow label={t('nutrition')} state={generation.nutrition} retry={generation.retryNutrition} />
      {generation.finalization === 'error' && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
          <span style={{ color: RED, fontSize: 12 }}>{t('finalizationError')}</span>
          <button type="button" onClick={generation.retryAll} style={{ minHeight: 44, padding: '0 12px', border: `1px solid ${BORDER}`, borderRadius: 10, background: 'transparent', color: GOLD, cursor: 'pointer', fontWeight: 700 }}>{t('retry')}</button>
        </div>
      )}
      <style>{`
        .initial-generation-spinner { animation: initial-generation-spin 0.8s linear infinite; }
        @keyframes initial-generation-spin { to { transform: rotate(360deg); } }
        @media (max-width: 390px) { .initial-generation-retry-label { display: none; } }
        @media (prefers-reduced-motion: reduce) { .initial-generation-spinner { animation: none; } }
      `}</style>
    </aside>
  )
}
