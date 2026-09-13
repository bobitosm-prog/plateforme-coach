'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { X } from 'lucide-react'

import type { HomeViewModel } from '../../../../lib/home/home-dashboard-model'
import {
  RECOVERY_BODY_ASSETS,
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
  type RecoveryMaskView,
} from '../../../../lib/home/recovery-mask-assets'
import {
  resolveRecoveryPointerZoneFromMasks,
  type RecoveryMaskAlphaReader,
} from '../../../../lib/home/recovery-mask-hit-test'
import type { MuscleRecovery, RecoveryStatus, RecoveryZone } from '../../../../lib/home/recovery-model'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { RailOverlay } from '../../ui/RailOverlay'
import styles from './RecoveryModal.module.css'

const maskReaderCache = new Map<RecoveryMaskView, Promise<readonly RecoveryMaskAlphaReader[] | null>>()
type RecoveryMaskHitState = 'loading' | 'ready' | 'error'
const SELECTABLE_RECOVERY_ZONES = [...new Set(RECOVERY_MASK_ASSETS.map(asset => asset.zone))]

function loadRecoveryMaskReaders(view: RecoveryMaskView): Promise<readonly RecoveryMaskAlphaReader[] | null> {
  const cached = maskReaderCache.get(view)
  if (cached) return cached

  const loadMask = (asset: (typeof RECOVERY_MASK_ASSETS)[number]) => new Promise<RecoveryMaskAlphaReader>((resolve, reject) => {
    const image = new window.Image()
    image.decoding = 'async'
    let settled = false

    const fail = () => {
      if (settled) return
      settled = true
      reject(new Error(`Unable to load recovery mask: ${asset.maskPath}`))
    }
    const createReader = () => {
      if (settled || !image.complete || image.naturalWidth === 0) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = RECOVERY_MASK_WIDTH
        canvas.height = RECOVERY_MASK_HEIGHT
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          fail()
          return
        }
        context.imageSmoothingEnabled = false
        context.drawImage(image, 0, 0, RECOVERY_MASK_WIDTH, RECOVERY_MASK_HEIGHT)
        const rgba = context.getImageData(0, 0, RECOVERY_MASK_WIDTH, RECOVERY_MASK_HEIGHT).data
        const alpha = new Uint8Array(RECOVERY_MASK_WIDTH * RECOVERY_MASK_HEIGHT)
        for (let index = 0; index < alpha.length; index += 1) alpha[index] = rgba[index * 4 + 3]
        settled = true
        resolve({
          view: asset.view,
          zone: asset.zone,
          readAlpha: (x, y) => alpha[y * RECOVERY_MASK_WIDTH + x] ?? 0,
        })
      } catch {
        fail()
      }
    }

    image.addEventListener('load', createReader, { once: true })
    image.addEventListener('error', fail, { once: true })
    image.src = asset.maskPath

    if (typeof image.decode === 'function') {
      void image.decode().then(createReader).catch(() => {
        // Safari can reject decode() even though the resource subsequently loads.
        // Keep the load/error listeners authoritative, and accept an already loaded image.
        if (image.complete && image.naturalWidth > 0) createReader()
      })
    }
  })

  const pending = Promise.all(RECOVERY_MASK_ASSETS.filter(asset => asset.view === view).map(loadMask))
    .catch(() => null)
  maskReaderCache.set(view, pending)
  void pending.then(readers => {
    if (!readers) maskReaderCache.delete(view)
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

export function resolveRecoverySelection(
  selected: RecoveryZone | null,
  zones: readonly MuscleRecovery[],
): { zone: RecoveryZone; recovery: MuscleRecovery | null } | null {
  const zone = selected ?? selectInitialRecoveryZone(zones)
  if (!zone) return null
  return { zone, recovery: zones.find(candidate => candidate.zone === zone) ?? null }
}

function BodyMap({ side, zones, selected, onSelect }: {
  side: RecoveryMaskView
  zones: ReadonlyMap<RecoveryZone, MuscleRecovery>
  selected: RecoveryZone | null
  onSelect: (zone: RecoveryZone) => void
}) {
  const t = useTranslations('home.v2.recoveryModal')
  const maskReaders = useRef<readonly RecoveryMaskAlphaReader[] | null>(null)
  const [maskHitState, setMaskHitState] = useState<RecoveryMaskHitState>('loading')
  useEffect(() => {
    let active = true
    maskReaders.current = null
    void loadRecoveryMaskReaders(side).then(readers => {
      if (!active) return
      maskReaders.current = readers
      setMaskHitState(readers ? 'ready' : 'error')
    })
    return () => {
      active = false
      maskReaders.current = null
    }
  }, [side])

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const zone = resolveRecoveryPointerZoneFromMasks(
      side,
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      maskReaders.current,
    )
    if (zone) onSelect(zone)
  }

  return <figure className={styles.bodyFigure}>
    <div
      className={styles.bodyVisual}
      onPointerUp={handlePointerUp}
      data-recovery-view={side}
      data-mask-hit-state={maskHitState}
      data-interactive={maskHitState === 'ready'}
    >
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
          const isSelected = selected === asset.zone
          if (status === 'unknown' && !isSelected) return null

          return <span
            key={`${side}-${asset.zone}-mask`}
            className={styles.maskLayer}
            data-mask-zone={asset.zone}
            data-status={status}
            data-selected={isSelected}
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
  const selection = resolveRecoverySelection(selected, recovery.zones)
  const selectedZoneId = selection?.zone ?? null
  const selectedZone = selection?.recovery ?? null
  const visibleZones = useMemo(
    () => recovery.state === 'loading' || recovery.state === 'error'
      ? new Map<RecoveryZone, MuscleRecovery>()
      : zones,
    [recovery.state, zones],
  )
  const visibleSelection = recovery.state === 'loading' || recovery.state === 'error' ? null : selectedZoneId
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
            <BodyMap side="front" zones={visibleZones} selected={visibleSelection} onSelect={setSelected} />
            <BodyMap side="back" zones={visibleZones} selected={visibleSelection} onSelect={setSelected} />
          </div>

          {recovery.state === 'loading' ? <div className={styles.statePanel} role="status">{t('loadingCopy')}</div>
            : recovery.state === 'error' ? <div className={styles.statePanel} role="status">{t('errorCopy')}</div>
              : selectedZoneId ? <section className={styles.details} aria-live="polite" aria-labelledby="recovery-zone-title">
                  <div className={styles.detailsHeading}>
                    <h3 id="recovery-zone-title">{muscleLabel(selectedZoneId)}</h3>
                    <span data-status={selectedZone?.status ?? 'unknown'}>{t(`status.${selectedZone?.status ?? 'unknown'}`)}</span>
                  </div>
                  {selectedZone ? <>
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
                  </> : <p className={styles.unevaluatedCopy}>{t('unevaluatedCopy')}</p>}
                </section>
                : <div className={styles.statePanel}>{t('emptyCopy')}</div>}

          <section className={styles.accessibleList} aria-labelledby="recovery-zone-list-title">
            <h3 id="recovery-zone-list-title">{t('zoneList')}</h3>
            <div>
              {SELECTABLE_RECOVERY_ZONES.map(zone => {
                const recoveryZone = zones.get(zone)
                return (
                  <button
                    key={zone}
                    type="button"
                    aria-pressed={selectedZoneId === zone}
                    onClick={() => setSelected(zone)}
                  >
                    <span>{muscleLabel(zone)}</span>
                    <small>{t(`status.${recoveryZone?.status ?? 'unknown'}`)}</small>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <p className={styles.disclaimer}>{t('disclaimer')}</p>
      </div>
    </div>
  </RailOverlay>
}
