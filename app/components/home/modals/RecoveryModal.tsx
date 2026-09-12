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
  { zone: 'chest', side: 'front', paths: ['M202 263 C226 239 276 239 311 258 C320 279 320 318 309 337 C278 354 229 350 206 326 C196 309 194 282 202 263 Z', 'M326 258 C361 239 411 239 435 263 C443 282 441 309 431 326 C408 350 359 354 328 337 C317 318 317 279 326 258 Z'] },
  { zone: 'shoulders', side: 'front', paths: ['M139 254 C152 232 177 222 203 229 L218 241 C204 260 197 292 196 321 C177 341 151 333 139 311 C133 294 132 271 139 254 Z', 'M434 241 L449 229 C475 222 500 232 513 254 C520 271 519 294 513 311 C501 333 475 341 456 321 C455 292 448 260 434 241 Z'] },
  { zone: 'biceps', side: 'front', paths: ['M148 327 C167 317 188 322 197 343 C200 367 194 406 181 423 C164 436 144 426 138 405 C134 379 136 345 148 327 Z', 'M478 327 C490 345 492 379 488 405 C482 426 462 436 445 423 C432 406 426 367 429 343 C438 322 459 317 478 327 Z'] },
  { zone: 'core', side: 'front', paths: ['M266 357 C282 350 301 350 313 359 L313 402 C297 410 278 408 266 398 Z', 'M324 359 C336 350 355 350 371 357 L371 398 C359 408 340 410 324 402 Z', 'M265 410 C280 403 299 404 313 412 L313 449 C299 456 280 455 265 447 Z', 'M324 412 C338 404 357 403 372 410 L372 447 C357 455 338 456 324 449 Z', 'M267 455 C281 449 299 451 313 459 L313 490 C299 499 281 497 267 489 Z', 'M324 459 C338 451 356 449 370 455 L370 489 C356 497 338 499 324 490 Z', 'M270 496 C283 491 300 493 313 501 L313 548 C296 546 280 539 270 530 Z', 'M324 501 C337 493 354 491 367 496 L367 530 C357 539 341 546 324 548 Z', 'M230 383 C245 369 258 375 263 394 L263 523 C251 539 236 535 224 521 C215 481 215 420 230 383 Z', 'M407 383 C422 420 422 481 413 521 C401 535 386 539 374 523 L374 394 C379 375 392 369 407 383 Z'] },
  { zone: 'quadriceps', side: 'front', paths: ['M198 604 C220 587 250 592 269 615 C280 663 273 747 249 786 C232 809 209 798 195 774 C181 723 180 647 198 604 Z', 'M272 612 C291 626 300 674 296 730 C292 773 280 806 263 815 C247 807 245 790 251 775 C273 730 278 664 272 612 Z', 'M365 612 C359 664 364 730 386 775 C392 790 390 807 374 815 C357 806 345 773 341 730 C337 674 346 626 365 612 Z', 'M368 615 C387 592 417 587 439 604 C457 647 456 723 442 774 C428 798 405 809 388 786 C364 747 357 663 368 615 Z'] },
  { zone: 'shoulders', side: 'back', paths: ['M104 264 C119 238 153 229 184 240 C200 252 204 276 198 306 C185 329 156 340 125 327 C105 316 96 289 104 264 Z', 'M427 240 C458 229 492 238 507 264 C515 289 506 316 486 327 C455 340 426 329 413 306 C407 276 411 252 427 240 Z'] },
  { zone: 'back', side: 'back', paths: ['M244 158 C265 151 286 151 297 161 L297 326 C268 309 234 285 199 257 C213 214 227 177 244 158 Z', 'M314 161 C325 151 346 151 367 158 C384 177 398 214 412 257 C377 285 343 309 314 326 Z', 'M164 329 C188 315 232 322 269 347 C286 373 288 421 267 447 L232 471 C196 455 169 413 154 365 C151 347 154 336 164 329 Z', 'M447 329 C457 336 460 347 457 365 C442 413 415 455 379 471 L344 447 C323 421 325 373 342 347 C379 322 423 315 447 329 Z', 'M270 452 C286 440 297 449 297 469 L297 526 C273 516 249 505 228 491 Z', 'M314 469 C314 449 325 440 341 452 L383 491 C362 505 338 516 314 526 Z'] },
  { zone: 'triceps', side: 'back', paths: ['M106 330 C126 320 146 331 153 354 C155 382 147 416 132 435 C115 444 98 430 92 408 C90 378 95 347 106 330 Z', 'M505 330 C516 347 521 378 519 408 C513 430 496 444 479 435 C464 416 456 382 458 354 C465 331 485 320 505 330 Z'] },
  { zone: 'glutes', side: 'back', paths: ['M190 529 C216 511 263 511 291 534 C300 558 300 615 284 638 C259 656 218 655 193 635 C178 609 176 558 190 529 Z', 'M320 534 C348 511 395 511 421 529 C435 558 433 609 418 635 C393 655 352 656 327 638 C311 615 311 558 320 534 Z'] },
  { zone: 'hamstrings', side: 'back', paths: ['M171 654 C190 642 222 648 244 668 C252 706 244 773 224 805 C205 821 183 808 172 783 C160 741 158 686 171 654 Z', 'M249 663 C268 667 284 692 291 728 C290 768 280 799 264 818 C248 811 240 787 242 758 C250 724 254 692 249 663 Z', 'M362 663 C357 692 361 724 369 758 C371 787 363 811 347 818 C331 799 321 768 320 728 C327 692 343 667 362 663 Z', 'M367 668 C389 648 421 642 440 654 C453 686 451 741 439 783 C428 808 406 821 387 805 C367 773 359 706 367 668 Z'] },
  { zone: 'calves', side: 'back', paths: ['M143 855 C163 839 190 842 207 865 C221 903 217 968 196 1007 C180 1030 158 1023 146 1000 C132 959 130 891 143 855 Z', 'M213 853 C229 866 237 903 234 945 C231 978 221 1006 207 1022 C196 1009 195 990 201 971 C215 931 219 889 213 853 Z', 'M398 853 C392 889 396 931 410 971 C416 990 415 1009 404 1022 C390 1006 380 978 377 945 C374 903 382 866 398 853 Z', 'M404 865 C421 842 448 839 468 855 C481 891 479 959 465 1000 C453 1023 431 1030 415 1007 C394 968 390 903 404 865 Z'] },
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
        src={`/images/recovery/body-${side}-anatomical.webp`}
        alt={t(`imageAlt.${side}`)}
        fill
        sizes="(max-width: 699px) 44vw, 260px"
        className={styles.bodyImage}
        draggable={false}
      />
      <svg className={styles.bodyOverlay} viewBox="0 0 611 1286" aria-label={t('mapLabel', { side: t(`side.${side}`) })}>
        {ZONE_SHAPES.filter(shape => shape.side === side).map(shape => {
          const zone = zones.get(shape.zone)
          const activate = () => onSelect(shape.zone)
          const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
            if (!zone) return
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            activate()
          }
          return <g
            key={`${side}-${shape.zone}`}
            role={zone ? 'button' : undefined}
            tabIndex={zone ? 0 : undefined}
            aria-label={zone ? t('selectZone', { muscle: label(shape.zone), status: t(`status.${zone.status}`) }) : undefined}
            aria-pressed={zone ? selected === shape.zone : undefined}
            aria-hidden={zone ? undefined : true}
            className={styles.zone}
            data-status={zone?.status ?? 'unknown'}
            data-selected={selected === shape.zone}
            onClick={zone ? activate : undefined}
            onKeyDown={zone ? onKeyDown : undefined}
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

        <div className={styles.content}>
          <div className={styles.maps}>
            <BodyMap side="front" zones={zones} selected={selectedZone?.zone ?? null} onSelect={setSelected} label={muscleLabel} />
            <BodyMap side="back" zones={zones} selected={selectedZone?.zone ?? null} onSelect={setSelected} label={muscleLabel} />
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
