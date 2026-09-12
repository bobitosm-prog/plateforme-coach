'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { X } from 'lucide-react'

import type { HomeViewModel } from '../../../../lib/home/home-dashboard-model'
import {
  RECOVERY_ATLAS_ASSETS,
  RECOVERY_BODY_ASSETS,
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
  type RecoveryMaskView,
} from '../../../../lib/home/recovery-mask-assets'
import { resolveRecoveryPointerZone, type RecoveryAtlasPixelReader } from '../../../../lib/home/recovery-mask-hit-test'
import type { MuscleRecovery, RecoveryStatus, RecoveryZone } from '../../../../lib/home/recovery-model'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { RailOverlay } from '../../ui/RailOverlay'
import styles from './RecoveryModal.module.css'

const atlasReaderCache = new Map<RecoveryMaskView, Promise<RecoveryAtlasPixelReader | null>>()

function loadRecoveryAtlas(view: RecoveryMaskView): Promise<RecoveryAtlasPixelReader | null> {
  const cached = atlasReaderCache.get(view)
  if (cached) return cached

  const pending = new Promise<RecoveryAtlasPixelReader | null>((resolve) => {
    const atlas = new window.Image()
    atlas.decoding = 'async'
    atlas.src = RECOVERY_ATLAS_ASSETS[view]
    void atlas.decode().then(() => {
      const canvas = document.createElement('canvas')
      canvas.width = RECOVERY_MASK_WIDTH
      canvas.height = RECOVERY_MASK_HEIGHT
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) {
        resolve(null)
        return
      }
      context.imageSmoothingEnabled = false
      context.drawImage(atlas, 0, 0, RECOVERY_MASK_WIDTH, RECOVERY_MASK_HEIGHT)
      resolve((x, y) => context.getImageData(x, y, 1, 1).data)
    }).catch(() => resolve(null))
  })
  atlasReaderCache.set(view, pending)
  void pending.then(reader => {
    if (!reader) atlasReaderCache.delete(view)
  })
  return pending
}

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

function BodyMap({ side, zones, onSelect }: {
  side: RecoveryMaskView
  zones: ReadonlyMap<RecoveryZone, MuscleRecovery>
  onSelect: (zone: RecoveryZone) => void
}) {
  const t = useTranslations('home.v2.recoveryModal')
  const atlasReader = useRef<RecoveryAtlasPixelReader | null>(null)
  useEffect(() => {
    let active = true
    atlasReader.current = null
    void loadRecoveryAtlas(side).then(reader => {
      if (active) atlasReader.current = reader
    })
    return () => {
      active = false
      atlasReader.current = null
    }
  }, [side])

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const zone = resolveRecoveryPointerZone(
      side,
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      atlasReader.current,
    )
    if (zone && zones.has(zone)) onSelect(zone)
  }

  return <figure className={styles.bodyFigure}>
    <div className={styles.bodyVisual} onPointerUp={handlePointerUp} data-recovery-view={side} data-interactive={zones.size > 0}>
      <Image
        src={RECOVERY_BODY_ASSETS[side]}
        alt={t(`imageAlt.${side}`)}
        fill
        sizes="(max-width: 699px) 44vw, 260px"
        className={styles.bodyImage}
        loading="eager"
        draggable={false}
      />
      <div className={styles.maskLayers} aria-hidden="true">
        {RECOVERY_MASK_ASSETS.filter(asset => asset.view === side).map(asset => {
          const status = zones.get(asset.zone)?.status ?? 'unknown'
          if (status === 'unknown') return null

          return <span
            key={`${side}-${asset.zone}-mask`}
            className={styles.maskLayer}
            data-mask-zone={asset.zone}
            data-status={status}
            style={{ '--recovery-mask-image': `url("${asset.maskPath}")` } as CSSProperties}
          />
        })}
      </div>
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

        <div className={styles.content}>
          <div className={styles.maps}>
            <BodyMap side="front" zones={zones} onSelect={setSelected} />
            <BodyMap side="back" zones={zones} onSelect={setSelected} />
          </div>

          {recovery.state === 'loading' ? <div className={styles.statePanel} role="status">{t('loadingCopy')}</div>
            : recovery.state === 'error' ? <div className={styles.statePanel} role="status">{t('errorCopy')}</div>
              : recovery.zones.length === 0 ? <div className={styles.statePanel}>{t('emptyCopy')}</div>
                : <section className={styles.details} aria-live="polite" aria-labelledby="recovery-zone-title">
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
                </section>}

          {recovery.zones.length > 0 &&
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
                </section>}
        </div>

        <p className={styles.disclaimer}>{t('disclaimer')}</p>
      </div>
    </div>
  </RailOverlay>
}
