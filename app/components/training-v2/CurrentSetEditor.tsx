import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'
import { LOAD_MODES, type LoadMode } from '@/lib/training/load-volume'

interface CurrentSetEditorProps {
  loadMode?: LoadMode
  loadModeLocked?: boolean
  onLoadModeChange?: (mode: LoadMode) => void
  stepLabel?: string
  timed?: boolean
  setNumber: number
  totalSets: number
  weight: string
  reps: number | ''
  rir: number | null
  weightStep: number
  showRir: boolean
  canValidate: boolean
  suggestion: { label: string; weight: number } | null
  statusMessage: string
  onWeightChange: (value: string) => void
  onWeightFocus: () => void
  onWeightBlur: () => void
  onAdjustWeight: (direction: -1 | 1) => void
  onRepsChange: (value: string) => void
  onAdjustReps: (direction: -1 | 1) => void
  onRirChange: (value: number) => void
  onUseSuggestion: () => void
  onValidate: () => void
}

export default function CurrentSetEditor({
  loadMode, loadModeLocked, onLoadModeChange,
  stepLabel,
  timed = false,
  setNumber,
  totalSets,
  weight,
  reps,
  rir,
  weightStep,
  showRir,
  canValidate,
  suggestion,
  statusMessage,
  onWeightChange,
  onWeightFocus,
  onWeightBlur,
  onAdjustWeight,
  onRepsChange,
  onAdjustReps,
  onRirChange,
  onUseSuggestion,
  onValidate,
}: CurrentSetEditorProps) {
  const t = useTranslations('training_tab.v2')
  const load = useTranslations('trainingLoad')
  const setProgress = totalSets > 0 ? Math.min(100, Math.max(0, (setNumber / totalSets) * 100)) : 0

  return (
    <section className={styles.setEditor} aria-labelledby="current-set-title">
      <div className={styles.setEditorHeader}>
        <div id="current-set-title" className={styles.setEditorTitle}>{stepLabel || t('currentSet', { current: setNumber, total: totalSets })}</div>
        <div
          className={styles.setProgress}
          role="progressbar"
          aria-label={t('setProgress', { current: setNumber, total: totalSets })}
          aria-valuemin={1}
          aria-valuemax={Math.max(1, totalSets)}
          aria-valuenow={Math.min(Math.max(1, setNumber), Math.max(1, totalSets))}
        >
          <span style={{ width: `${setProgress}%` }} />
        </div>
      </div>

      <div className={styles.setEditorControls}>
        {!timed && <div className={styles.setControlGroup}>
          <label className={styles.setControlLabel} htmlFor="training-current-weight">{t('weight')}</label>
          <div className={styles.stepper}>
            <button type="button" aria-label={t('decreaseWeight', { step: weightStep })} onClick={() => onAdjustWeight(-1)}>−</button>
            <div className={styles.stepperValue}>
              <input
                id="training-current-weight"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={weight}
                onFocus={onWeightFocus}
                onChange={event => onWeightChange(event.target.value)}
                onBlur={onWeightBlur}
              />
              <span>kg</span>
            </div>
            <button type="button" aria-label={t('increaseWeight', { step: weightStep })} onClick={() => onAdjustWeight(1)}>+</button>
          </div>
        </div>}

        <div className={styles.setControlGroup}>
          <label className={styles.setControlLabel} htmlFor="training-current-reps">{t(timed ? 'durationSeconds' : 'repetitions')}</label>
          <div className={styles.stepper}>
            <button type="button" aria-label={t(timed ? 'decreaseDuration' : 'decreaseReps')} onClick={() => onAdjustReps(-1)}>−</button>
            <div className={styles.stepperValue}>
              <input
                id="training-current-reps"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={reps}
                onChange={event => onRepsChange(event.target.value)}
              />
            </div>
            <button type="button" aria-label={t(timed ? 'increaseDuration' : 'increaseReps')} onClick={() => onAdjustReps(1)}>+</button>
          </div>
        </div>
      </div>

      {!timed && loadMode && onLoadModeChange && <div style={{marginBlock:12}}>
        <label htmlFor="training-load-mode">{load('convention')}</label>
        <select id="training-load-mode" disabled={loadModeLocked} value={loadMode} onChange={event=>onLoadModeChange(event.target.value as LoadMode)} style={{display:'block',width:'100%',minHeight:44,background:'#18150e',color:'#fff',padding:8,border:'1px solid #C9A84C',borderRadius:8}}>
          {LOAD_MODES.filter(mode=>mode!=='legacy'||loadMode==='legacy').map(mode=><option key={mode} value={mode}>{load(mode)}</option>)}
        </select>
        <p style={{fontSize:13}}>{load(`${loadMode}Help`)}</p>
      </div>}

      {showRir && <fieldset className={styles.rirFieldset}>
        <legend>{t('rir')}</legend>
        <div className={styles.rirOptions}>
          {[0, 1, 2, 3, 4].map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={rir === value}
              onClick={() => onRirChange(value)}
            >
              {value === 4 ? '4+' : value}
            </button>
          ))}
        </div>
      </fieldset>}

      {suggestion && <div className={styles.suggestionRow}>
        <div>
          <span>{t('suggestion')}</span>
          <strong>{suggestion.label}</strong>
        </div>
        <button type="button" onClick={onUseSuggestion}>{t('useSuggestion')}</button>
      </div>}

      <button type="button" className={styles.validateSetButton} disabled={!canValidate} onClick={onValidate}>
        {t('validateSet')}
      </button>
      <div className={styles.setStatus} aria-live="polite">{statusMessage}</div>
    </section>
  )
}
