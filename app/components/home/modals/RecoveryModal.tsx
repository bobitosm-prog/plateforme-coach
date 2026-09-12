'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import type { HomeViewModel } from '../../../../lib/home/home-dashboard-model'
import type { MuscleRecovery, RecoveryStatus, RecoveryZone } from '../../../../lib/home/recovery-model'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { RailOverlay } from '../../ui/RailOverlay'
import styles from './RecoveryModal.module.css'

type BodySide = 'front' | 'back'

interface ZoneShape {
  zone: RecoveryZone
  side: BodySide
  paths: readonly string[]
}

const ZONE_SHAPES: readonly ZoneShape[] = [
  { zone: 'chest', side: 'front', paths: ['M423 340 C455 315 505 318 535 344 L535 475 C485 468 445 447 414 408 Z', 'M551 344 C581 318 631 315 663 340 L672 408 C641 447 601 468 551 475 Z'] },
  { zone: 'shoulders', side: 'front', paths: ['M350 323 C374 282 421 272 458 310 L414 407 C370 405 342 374 350 323 Z', 'M736 323 C712 282 665 272 628 310 L672 407 C716 405 744 374 736 323 Z'] },
  { zone: 'biceps', side: 'front', paths: ['M340 405 C380 394 411 416 414 463 L384 565 C351 571 329 545 332 500 Z', 'M746 405 C706 394 675 416 672 463 L702 565 C735 571 757 545 754 500 Z'] },
  { zone: 'core', side: 'front', paths: ['M438 450 C474 472 510 480 543 478 C576 480 612 472 648 450 L636 661 C598 686 488 686 450 661 Z'] },
  { zone: 'quadriceps', side: 'front', paths: ['M386 842 C421 818 478 820 510 856 L491 1074 C451 1110 400 1082 382 1015 Z', 'M700 842 C665 818 608 820 576 856 L595 1074 C635 1110 686 1082 704 1015 Z'] },
  { zone: 'shoulders', side: 'back', paths: ['M338 314 C372 272 430 266 467 304 L420 411 C366 414 330 374 338 314 Z', 'M748 314 C714 272 656 266 619 304 L666 411 C720 414 756 374 748 314 Z'] },
  { zone: 'back', side: 'back', paths: ['M420 332 C455 314 493 319 535 344 L535 650 C473 635 426 576 404 476 Z', 'M666 332 C631 314 593 319 551 344 L551 650 C613 635 660 576 682 476 Z'] },
  { zone: 'triceps', side: 'back', paths: ['M333 400 C370 388 404 410 410 454 L378 574 C345 573 323 542 326 494 Z', 'M753 400 C716 388 682 410 676 454 L708 574 C741 573 763 542 760 494 Z'] },
  { zone: 'glutes', side: 'back', paths: ['M393 752 C433 724 497 732 535 773 L528 895 C473 921 413 900 387 850 Z', 'M693 752 C653 724 589 732 551 773 L558 895 C613 921 673 900 699 850 Z'] },
  { zone: 'hamstrings', side: 'back', paths: ['M389 884 C430 909 483 915 522 893 L500 1090 C464 1124 407 1098 389 1035 Z', 'M697 884 C656 909 603 915 564 893 L586 1090 C622 1124 679 1098 697 1035 Z'] },
  { zone: 'calves', side: 'back', paths: ['M401 1091 C437 1070 478 1080 496 1120 L472 1301 C445 1331 407 1315 395 1260 Z', 'M685 1091 C649 1070 608 1080 590 1120 L614 1301 C641 1331 679 1315 691 1260 Z'] },
]

const STATUS_PRIORITY: Record<Exclude<RecoveryStatus, 'unknown'>, number> = {
  leave_alone: 0,
  recovering: 1,
  probably_ready: 2,
}

export function selectInitialRecoveryZone(zones: readonly MuscleRecovery[]): RecoveryZone | null {
  return zones.reduce<MuscleRecovery | null>((selected, zone) => (
    !selected || STATUS_PRIORITY[zone.status] < STATUS_PRIORITY[selected.status] ? zone : selected
  ), null)?.zone ?? null
}

function BodyMap({ side, zones, selected, onSelect, label }: {
  side: BodySide
  zones: ReadonlyMap<RecoveryZone, MuscleRecovery>
  selected: RecoveryZone | null
  onSelect: (zone: RecoveryZone) => void
  label: (zone: RecoveryZone) => string
}) {
  const t = useTranslations('home.v2.recoveryModal')
  return <figure className={styles.bodyFigure}>
    <div className={styles.bodyVisual}>
      <Image
        src={`/images/recovery/body-${side}.webp`}
        alt={t(`imageAlt.${side}`)}
        fill
        sizes="(max-width: 699px) 44vw, 260px"
        className={styles.bodyImage}
        draggable={false}
      />
      <svg className={styles.bodyOverlay} viewBox="0 0 1086 1448" aria-label={t('mapLabel', { side: t(`side.${side}`) })}>
        {ZONE_SHAPES.filter(shape => shape.side === side && zones.has(shape.zone)).map(shape => {
          const zone = zones.get(shape.zone)!
          const activate = () => onSelect(shape.zone)
          const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            activate()
          }
          return <g
            key={`${side}-${shape.zone}`}
            role="button"
            tabIndex={0}
            aria-label={t('selectZone', { muscle: label(shape.zone), status: t(`status.${zone.status}`) })}
            aria-pressed={selected === shape.zone}
            className={styles.zone}
            data-status={zone.status}
            data-selected={selected === shape.zone}
            onClick={activate}
            onKeyDown={onKeyDown}
          >
            <title>{label(shape.zone)}</title>
            {shape.paths.map(path => <path key={path} d={path} />)}
          </g>
        })}
      </svg>
    </div>
    <figcaption>{t(`side.${side}`)}</figcaption>
  </figure>
}

export default function RecoveryModal({ recovery, onClose }: {
  recovery: HomeViewModel['recovery']
  onClose: () => void
}) {
  const t = useTranslations('home.v2.recoveryModal')
  const locale = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState<RecoveryZone | null>(() => selectInitialRecoveryZone(recovery.zones))
  useFocusTrap({ active: true, containerRef: dialogRef, initialFocusRef: closeRef, onEscape: onClose })
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const zones = useMemo(() => new Map(recovery.zones.map(zone => [zone.zone, zone])), [recovery.zones])
  const selectedZone = (selected && zones.get(selected)) ?? recovery.zones[0] ?? null
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), [locale])
  const muscleLabel = (zone: RecoveryZone) => t(`muscles.${zone}`)

  return <RailOverlay>
    <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-dialog-title"
        aria-describedby="recovery-dialog-description"
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h2 id="recovery-dialog-title">{t('title')}</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={t('close')}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <p id="recovery-dialog-description" className={styles.description}>{t('description')}</p>
        <div className={styles.overall} data-status={recovery.status} role={recovery.state === 'error' ? 'status' : undefined} aria-busy={recovery.state === 'loading'}>
          <span>{t('overall')}</span>
          <strong>{recovery.state === 'loading' ? t('loading') : recovery.state === 'error' ? t('error') : t(`status.${recovery.status}`)}</strong>
        </div>

        {recovery.state === 'loading' ? <div className={styles.statePanel} role="status">{t('loadingCopy')}</div>
          : recovery.state === 'error' ? <div className={styles.statePanel} role="status">{t('errorCopy')}</div>
            : recovery.zones.length === 0 ? <div className={styles.statePanel}>{t('emptyCopy')}</div>
              : <div className={styles.content}>
                <div className={styles.maps}>
                  <BodyMap side="front" zones={zones} selected={selectedZone?.zone ?? null} onSelect={setSelected} label={muscleLabel} />
                  <BodyMap side="back" zones={zones} selected={selectedZone?.zone ?? null} onSelect={setSelected} label={muscleLabel} />
                </div>

                <section className={styles.details} aria-live="polite" aria-labelledby="recovery-zone-title">
                  {selectedZone && <>
                    <div className={styles.detailsHeading}>
                      <h3 id="recovery-zone-title">{muscleLabel(selectedZone.zone)}</h3>
                      <span data-status={selectedZone.status}>{t(`status.${selectedZone.status}`)}</span>
                    </div>
                    <dl>
                      <div><dt>{t('lastWorked')}</dt><dd>{dateFormatter.format(new Date(selectedZone.lastWorkedAt))}</dd></div>
                      <div><dt>{t('elapsed')}</dt><dd>{t('hoursElapsed', { hours: Math.floor(selectedZone.elapsedHours) })}</dd></div>
                      <div><dt>{t('window')}</dt><dd>{t('hoursWindow', { min: selectedZone.window.minHours, max: selectedZone.window.maxHours })}</dd></div>
                      <div><dt>{t('sets')}</dt><dd>{selectedZone.source === 'session_fallback' ? t('setsUnknown') : t('setCount', { count: selectedZone.setCount })}</dd></div>
                      <div><dt>{t('confidenceLabel')}</dt><dd>{t(`confidence.${selectedZone.confidence}`)}</dd></div>
                    </dl>
                    <div className={styles.exercises}>
                      <h4>{t('exercises')}</h4>
                      {selectedZone.exercises.length > 0
                        ? <ul>{selectedZone.exercises.map(exercise => <li key={exercise}>{exercise}</li>)}</ul>
                        : <p>{t('exercisesUnknown')}</p>}
                    </div>
                  </>}
                </section>

                <section className={styles.accessibleList} aria-labelledby="recovery-zone-list-title">
                  <h3 id="recovery-zone-list-title">{t('zoneList')}</h3>
                  <div>
                    {recovery.zones.map(zone => <button
                      key={zone.zone}
                      type="button"
                      aria-pressed={selectedZone?.zone === zone.zone}
                      onClick={() => setSelected(zone.zone)}
                    >
                      <span>{muscleLabel(zone.zone)}</span>
                      <small>{t(`status.${zone.status}`)}</small>
                    </button>)}
                  </div>
                </section>
              </div>}

        <p className={styles.disclaimer}>{t('disclaimer')}</p>
      </div>
    </div>
  </RailOverlay>
}
