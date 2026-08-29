import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface CurrentSetEditorProps {
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
  onWeightBlur: () => void
  onAdjustWeight: (direction: -1 | 1) => void
  onRepsChange: (value: string) => void
  onAdjustReps: (direction: -1 | 1) => void
  onRirChange: (value: number) => void
  onUseSuggestion: () => void
  onValidate: () => void
}

export default function CurrentSetEditor({
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
  onWeightBlur,
  onAdjustWeight,
  onRepsChange,
  onAdjustReps,
  onRirChange,
  onUseSuggestion,
  onValidate,
}: CurrentSetEditorProps) {
  const t = useTranslations('training_tab.v2')

  return (
    <section className={styles.setEditor} aria-labelledby="current-set-title">
      <div id="current-set-title" className={styles.setEditorTitle}>{t('currentSet', { current: setNumber, total: totalSets })}</div>

      <div className={styles.setEditorControls}>
        <div className={styles.setControlGroup}>
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
                onChange={event => onWeightChange(event.target.value)}
                onBlur={onWeightBlur}
              />
              <span>kg</span>
            </div>
            <button type="button" aria-label={t('increaseWeight', { step: weightStep })} onClick={() => onAdjustWeight(1)}>+</button>
          </div>
        </div>

        <div className={styles.setControlGroup}>
          <label className={styles.setControlLabel} htmlFor="training-current-reps">{t('repetitions')}</label>
          <div className={styles.stepper}>
            <button type="button" aria-label={t('decreaseReps')} onClick={() => onAdjustReps(-1)}>−</button>
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
            <button type="button" aria-label={t('increaseReps')} onClick={() => onAdjustReps(1)}>+</button>
          </div>
        </div>
      </div>

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
