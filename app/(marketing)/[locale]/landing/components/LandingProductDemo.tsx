'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Activity, BrainCircuit, Dumbbell, UtensilsCrossed } from 'lucide-react'
import gsap from 'gsap'
import type { LandingV2Copy } from '../landing-v2-copy'
import styles from '../LandingV2.module.css'

type DemoTab = keyof LandingV2Copy['tabs']

const TABS: readonly { id: DemoTab; icon: typeof Dumbbell }[] = [
  { id: 'training', icon: Dumbbell },
  { id: 'nutrition', icon: UtensilsCrossed },
  { id: 'recovery', icon: Activity },
  { id: 'athena', icon: BrainCircuit },
]

export default function LandingProductDemo({ copy }: { copy: LandingV2Copy }) {
  const [active, setActive] = useState<DemoTab>('training')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(panelRef.current, { autoAlpha: 0.45, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out', clearProps: 'transform,opacity,visibility' })
  }, [active])

  const moveTabFocus = (event: React.KeyboardEvent<HTMLButtonElement>, current: DemoTab) => {
    const currentIndex = TABS.findIndex(tab => tab.id === current)
    let nextIndex: number | undefined

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    const next = TABS[nextIndex].id
    setActive(next)
    document.getElementById(`landing-tab-${next}`)?.focus()
  }

  return (
    <div className={styles.demoShell}>
      <div className={styles.demoTabs} role="tablist" aria-label={copy.system.title}>
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-label={copy.tabs[id].label}
            aria-selected={active === id}
            aria-controls={`landing-panel-${id}`}
            id={`landing-tab-${id}`}
            className={styles.demoTab}
            data-active={active === id}
            tabIndex={active === id ? 0 : -1}
            onClick={() => setActive(id)}
            onKeyDown={event => moveTabFocus(event, id)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{copy.tabs[id].label}</span>
          </button>
        ))}
      </div>

      <div
        key={active}
        ref={panelRef}
        id={`landing-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`landing-tab-${active}`}
        className={styles.demoPanel}
      >
        <div className={styles.demoNarrative}>
          <span>{copy.tabs[active].kicker}</span>
          <h3>{copy.tabs[active].title}</h3>
          <p>{copy.tabs[active].body}</p>
          <div className={styles.demoDots} aria-hidden="true">
            {TABS.map(tab => <i key={tab.id} data-active={tab.id === active} />)}
          </div>
        </div>
        <div className={styles.demoCanvas}>
          {active === 'training' && <TrainingDemo copy={copy} />}
          {active === 'nutrition' && <NutritionDemo copy={copy} />}
          {active === 'recovery' && <RecoveryDemo copy={copy} />}
          {active === 'athena' && <AthenaDemo copy={copy} />}
        </div>
      </div>
    </div>
  )
}

function TrainingDemo({ copy }: { copy: LandingV2Copy }) {
  return <div className={styles.trainingDemo}>
    <div className={styles.demoTopline}><span>{copy.training.set}</span><strong>03 / 04</strong></div>
    <h4>{copy.training.exercise}</h4>
    <p>{copy.training.target}</p>
    <div className={styles.setValues}>
      <div><span>KG</span><strong>{copy.training.weight}</strong></div>
      <div><span>REPS</span><strong>{copy.training.reps}</strong></div>
      <div><span>EFFORT</span><strong>{copy.training.effort}</strong></div>
    </div>
    <div className={styles.progressTrack}><i /></div>
    <small>{copy.training.progress}</small>
  </div>
}

function NutritionDemo({ copy }: { copy: LandingV2Copy }) {
  return <div className={styles.nutritionDemo}>
    <div className={styles.calorieDial}>
      <span>{copy.nutrition.consumed}</span>
      <strong>1 620</strong>
      <small>kcal</small>
    </div>
    <div className={styles.macroList}>
      {[
        [copy.nutrition.proteins, '118 / 150 g', '79%'],
        [copy.nutrition.carbs, '164 / 240 g', '68%'],
        [copy.nutrition.fats, '52 / 70 g', '74%'],
      ].map(([label, value, width]) => <div key={label}>
        <p><span>{label}</span><strong>{value}</strong></p>
        <i><b style={{ width }} /></i>
      </div>)}
      <small>3 {copy.nutrition.meals.toLowerCase()} · {copy.nutrition.target} 2 250 kcal</small>
    </div>
  </div>
}

function RecoveryDemo({ copy }: { copy: LandingV2Copy }) {
  return <div className={styles.recoveryDemo}>
    <div className={styles.bodyPair} aria-label={copy.tabs.recovery.title}>
      <div className={styles.bodyFigure}>
        <Image src="/images/recovery/v2/body-front-neutral.webp" alt="" fill sizes="160px" />
        <span className={`${styles.bodyMask} ${styles.chestMask}`} />
        <span className={`${styles.bodyMask} ${styles.quadsMask}`} />
      </div>
      <div className={styles.bodyFigure}>
        <Image src="/images/recovery/v2/body-back-neutral.webp" alt="" fill sizes="160px" />
        <span className={`${styles.bodyMask} ${styles.backMask}`} />
      </div>
    </div>
    <div className={styles.recoveryLegend}>
      <p><i data-state="amber" /><span>{copy.recovery.chest}</span><strong>{copy.recovery.recovering}</strong></p>
      <p><i data-state="green" /><span>{copy.recovery.legs}</span><strong>{copy.recovery.ready}</strong></p>
      <small>{copy.recovery.note}</small>
    </div>
  </div>
}

function AthenaDemo({ copy }: { copy: LandingV2Copy }) {
  return <div className={styles.athenaDemo}>
    <div className={styles.athenaHeader}><span><BrainCircuit size={17} aria-hidden="true" /></span><div><strong>Athena</strong><small>{copy.athena.active}</small></div></div>
    <p className={styles.userBubble}>{copy.athena.question}</p>
    <div className={styles.athenaBubble}>{copy.athena.answer}</div>
    <div className={styles.contextChip}><span>{copy.athena.source}</span><strong>{copy.athena.note}</strong></div>
  </div>
}
