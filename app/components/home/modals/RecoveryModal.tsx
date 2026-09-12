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
  { zone: 'chest', side: 'front', paths: ['M200 260 C224 242 270 238 300 249 C314 258 319 282 317 311 C315 335 293 349 261 352 C229 354 203 342 189 320 C180 302 185 278 200 260 Z', 'M338 249 C368 238 414 242 438 260 C453 278 458 302 449 320 C435 342 409 354 377 352 C345 349 323 335 321 311 C319 282 324 258 338 249 Z'] },
  { zone: 'shoulders', side: 'front', paths: ['M151 243 C168 230 195 222 218 230 C227 248 217 285 199 313 C186 333 164 341 147 327 C134 310 133 277 141 257 Z', 'M420 230 C443 222 470 230 487 243 L497 257 C505 277 504 310 491 327 C474 341 452 333 439 313 C421 285 411 248 420 230 Z'] },
  { zone: 'biceps', side: 'front', paths: ['M151 333 C170 322 192 328 201 347 C202 371 194 406 179 424 C163 436 145 425 139 405 C135 378 138 348 151 333 Z', 'M487 333 C500 348 503 378 499 405 C493 425 475 436 459 424 C444 406 436 371 437 347 C446 328 468 322 487 333 Z'] },
  { zone: 'core', side: 'front', paths: ['M267 357 C281 351 300 350 313 359 L313 401 C299 409 280 409 267 398 Z', 'M325 359 C338 350 357 351 371 357 L371 398 C358 409 339 409 325 401 Z', 'M266 411 C280 404 299 404 313 412 L313 448 C299 456 280 456 266 447 Z', 'M325 412 C339 404 358 404 372 411 L372 447 C358 456 339 456 325 448 Z', 'M268 455 C282 450 300 451 313 459 L313 489 C300 498 282 498 268 489 Z', 'M325 459 C338 451 356 450 370 455 L370 489 C356 498 338 498 325 489 Z', 'M271 496 C284 492 301 493 313 501 L313 547 C297 545 281 539 271 529 Z', 'M325 501 C337 493 354 492 367 496 L367 529 C357 539 341 545 325 547 Z', 'M231 382 C245 371 257 377 263 394 L263 520 C251 535 237 533 225 519 C216 478 217 418 231 382 Z', 'M407 382 C421 418 422 478 413 519 C401 533 387 535 375 520 L375 394 C381 377 393 371 407 382 Z'] },
  { zone: 'quadriceps', side: 'front', paths: ['M174 594 C193 582 219 584 240 603 C255 627 260 669 254 711 C248 750 234 782 215 796 C198 802 183 786 173 757 C161 712 159 630 174 594 Z', 'M244 606 C264 600 284 605 296 620 C300 665 296 726 281 768 C273 793 265 807 256 811 C245 803 241 786 246 769 C257 733 264 691 254 650 Z', 'M357 606 L357 650 C347 691 354 733 365 769 C370 786 366 803 355 811 C346 807 338 793 330 768 C315 726 311 665 315 620 C327 605 347 600 357 606 Z', 'M371 603 C392 584 418 582 437 594 C452 630 450 712 438 757 C428 786 413 802 396 796 C377 782 363 750 357 711 C351 669 356 627 371 603 Z'] },
  { zone: 'shoulders', side: 'back', paths: ['M104 270 C115 247 142 236 164 239 C183 245 193 261 192 282 C190 305 174 327 151 337 C129 339 108 327 100 309 C96 295 98 282 104 270 Z', 'M447 239 C469 236 496 247 507 270 C513 282 515 295 511 309 C503 327 482 339 460 337 C437 327 421 305 419 282 C418 261 428 245 447 239 Z'] },
  { zone: 'back', side: 'back', paths: ['M245 157 C261 152 274 153 282 166 L282 354 L239 260 L178 229 L192 201 Z', 'M329 166 C337 153 350 152 366 157 C381 164 399 181 419 201 L473 230 L372 260 L329 354 Z', 'M185 250 C204 239 229 243 239 259 C247 279 247 308 241 332 C220 329 201 316 187 296 C178 281 177 263 185 250 Z', 'M426 250 C434 263 433 281 424 296 C410 316 391 329 370 332 C364 308 364 279 372 259 C382 243 407 239 426 250 Z', 'M164 332 C184 319 225 324 253 344 C274 362 281 397 273 428 C264 448 249 462 233 469 C206 453 185 425 169 389 C157 361 155 341 164 332 Z', 'M447 332 C456 341 454 361 442 389 C426 425 405 453 378 469 C362 462 347 448 338 428 C330 397 337 362 358 344 C386 324 427 319 447 332 Z', 'M273 444 C280 450 283 460 283 470 L285 520 C253 512 218 501 187 486 L233 469 C247 460 261 451 273 444 Z', 'M338 444 C350 451 364 460 378 469 L424 486 C393 501 358 512 326 520 L328 470 C328 460 331 450 338 444 Z'] },
  { zone: 'triceps', side: 'back', paths: ['M106 331 C126 321 146 331 153 353 C155 380 147 414 132 433 C115 443 99 430 93 408 C90 378 95 347 106 331 Z', 'M505 331 C516 347 521 378 518 408 C512 430 496 443 479 433 C464 414 456 380 458 353 C465 331 485 321 505 331 Z'] },
  { zone: 'glutes', side: 'back', paths: ['M190 535 C214 516 257 514 284 532 C298 554 300 600 286 629 C271 650 230 654 203 640 C182 624 178 576 187 550 Z', 'M327 532 C354 514 397 516 421 535 L424 550 C433 576 429 624 408 640 C381 654 340 650 325 629 C311 600 313 554 327 532 Z'] },
  { zone: 'hamstrings', side: 'back', paths: ['M154 659 C169 649 187 649 199 659 C210 684 211 728 202 765 C195 792 183 808 168 811 C155 799 149 778 146 752 C142 714 144 678 154 659 Z', 'M213 660 C237 665 259 688 269 720 C277 758 276 800 261 824 C244 830 232 803 228 774 C233 732 228 691 213 660 Z', 'M398 660 C383 691 378 732 383 774 C379 803 367 830 350 824 C335 800 334 758 342 720 C352 688 374 665 398 660 Z', 'M412 659 C424 649 442 649 457 659 C467 678 469 714 465 752 C462 778 456 799 443 811 C428 808 416 792 409 765 C400 728 401 684 412 659 Z'] },
  { zone: 'calves', side: 'back', paths: ['M151 855 C132 878 119 915 121 951 C123 979 137 1005 153 1015 C165 997 175 978 177 958 C175 920 166 879 151 855 Z', 'M183 855 C200 866 211 900 211 936 C210 970 195 999 178 1017 C176 997 175 977 177 958 C180 923 176 881 183 855 Z', 'M428 855 C435 881 431 923 434 958 C436 977 435 997 433 1017 C416 999 401 970 400 936 C400 900 411 866 428 855 Z', 'M460 855 C445 879 436 920 434 958 C436 978 446 997 458 1015 C474 1005 488 979 490 951 C492 915 479 878 460 855 Z'] },
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
        loading="eager"
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
            {shape.paths.map(path => <path key={path} className={styles.hitArea} d={path} aria-hidden="true" focusable="false" />)}
            <path className={styles.zoneShape} d={shape.paths.join(' ')} />
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
