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
  regions?: readonly string[]
}

const ZONE_SHAPES: readonly ZoneShape[] = [
  { zone: 'chest', side: 'front', paths: ['M200 260 C224 242 270 238 300 249 C314 258 319 282 317 311 C315 335 293 349 261 352 C229 354 203 342 189 320 C180 302 185 278 200 260 Z', 'M338 249 C368 238 414 242 438 260 C453 278 458 302 449 320 C435 342 409 354 377 352 C345 349 323 335 321 311 C319 282 324 258 338 249 Z'] },
  { zone: 'shoulders', side: 'front', paths: ['M151 243 C168 230 195 222 218 230 C227 248 217 285 199 313 C186 333 164 341 147 327 C134 310 133 277 141 257 Z', 'M420 230 C443 222 470 230 487 243 L497 257 C505 277 504 310 491 327 C474 341 452 333 439 313 C421 285 411 248 420 230 Z'] },
  { zone: 'biceps', side: 'front', paths: ['M151 333 C170 322 192 328 201 347 C202 371 194 406 179 424 C163 436 145 425 139 405 C135 378 138 348 151 333 Z', 'M487 333 C500 348 503 378 499 405 C493 425 475 436 459 424 C444 406 436 371 437 347 C446 328 468 322 487 333 Z'] },
  { zone: 'core', side: 'front', paths: ['M267 357 C281 351 300 350 313 359 L313 401 C299 409 280 409 267 398 Z', 'M325 359 C338 350 357 351 371 357 L371 398 C358 409 339 409 325 401 Z', 'M266 411 C280 404 299 404 313 412 L313 448 C299 456 280 456 266 447 Z', 'M325 412 C339 404 358 404 372 411 L372 447 C358 456 339 456 325 448 Z', 'M268 455 C282 450 300 451 313 459 L313 489 C300 498 282 498 268 489 Z', 'M325 459 C338 451 356 450 370 455 L370 489 C356 498 338 498 325 489 Z', 'M271 496 C284 492 301 493 313 501 L313 547 C297 545 281 539 271 529 Z', 'M325 501 C337 493 354 492 367 496 L367 529 C357 539 341 545 325 547 Z', 'M231 382 C245 371 257 377 263 394 L263 520 C251 535 237 533 225 519 C216 478 217 418 231 382 Z', 'M407 382 C421 418 422 478 413 519 C401 533 387 535 375 520 L375 394 C381 377 393 371 407 382 Z'] },
  { zone: 'quadriceps', side: 'front', regions: ['outer-left', 'inner-left', 'inner-right', 'outer-right'], paths: ['M211 597 C190 606 175 636 171 680 C168 724 176 770 197 793 C212 798 226 777 237 744 C249 705 251 650 230 611 C224 603 218 598 211 597 Z', 'M234 599 C253 593 271 599 284 613 C287 648 279 694 264 737 C253 772 240 800 228 808 C217 798 218 780 225 759 C239 718 248 673 242 635 C240 619 237 607 234 599 Z', 'M377 599 C374 607 371 619 369 635 C363 673 372 718 386 759 C393 780 394 798 383 808 C371 800 358 772 347 737 C332 694 324 648 327 613 C340 599 358 593 377 599 Z', 'M400 597 C393 598 387 603 381 611 C360 650 362 705 374 744 C385 777 399 798 414 793 C435 770 443 724 440 680 C436 636 421 606 400 597 Z'] },
  { zone: 'shoulders', side: 'back', regions: ['rear-deltoid-left', 'rear-deltoid-right'], paths: ['M106 270 C119 249 141 239 161 242 C178 247 187 262 184 281 C180 302 162 321 140 332 C120 334 104 321 100 304 C98 291 100 280 106 270 Z', 'M505 270 C492 249 470 239 450 242 C433 247 424 262 427 281 C431 302 449 321 471 332 C491 334 507 321 511 304 C513 291 511 280 505 270 Z'] },
  { zone: 'back', side: 'back', regions: ['trapezius-left', 'trapezius-right', 'scapular-left', 'scapular-right', 'lats-left', 'lats-right', 'lumbar-left', 'lumbar-right'], paths: ['M247 158 C263 153 280 155 294 166 L294 341 C282 319 263 285 239 261 L181 229 L195 202 Z', 'M364 158 C348 153 331 155 317 166 L317 341 C329 319 348 285 372 261 L430 229 L416 202 Z', 'M186 251 C201 242 224 244 236 259 C243 278 243 305 238 327 C219 324 201 312 189 294 C181 280 180 263 186 251 Z', 'M425 251 C410 242 387 244 375 259 C368 278 368 305 373 327 C392 324 410 312 422 294 C430 280 431 263 425 251 Z', 'M165 333 C184 324 219 326 247 345 C268 363 274 395 268 425 C260 444 247 457 233 465 C208 450 188 423 173 389 C162 363 158 342 165 333 Z', 'M446 333 C427 324 392 326 364 345 C343 363 337 395 343 425 C351 444 364 457 378 465 C403 450 423 423 438 389 C449 363 453 342 446 333 Z', 'M272 447 C279 453 281 462 281 471 L283 515 C253 507 221 497 193 486 L234 469 C248 461 261 452 272 447 Z', 'M339 447 C332 453 330 462 330 471 L328 515 C358 507 390 497 418 486 L377 469 C363 461 350 452 339 447 Z'] },
  { zone: 'triceps', side: 'back', regions: ['triceps-left', 'triceps-right'], paths: ['M107 333 C124 325 142 333 149 353 C151 378 144 410 131 429 C116 437 102 426 97 406 C94 379 98 349 107 333 Z', 'M504 333 C487 325 469 333 462 353 C460 378 467 410 480 429 C495 437 509 426 514 406 C517 379 513 349 504 333 Z'] },
  { zone: 'glutes', side: 'back', regions: ['glute-left', 'glute-right'], paths: ['M192 537 C215 520 253 519 280 534 C293 555 294 596 282 625 C267 644 232 648 206 636 C186 621 183 578 190 552 Z', 'M419 537 C396 520 358 519 331 534 C318 555 317 596 329 625 C344 644 379 648 405 636 C425 621 428 578 421 552 Z'] },
  { zone: 'hamstrings', side: 'back', regions: ['outer-left', 'inner-left', 'inner-right', 'outer-right'], paths: ['M156 660 C169 653 184 652 195 660 C205 685 206 724 198 761 C192 785 182 802 170 807 C158 796 152 776 149 751 C145 716 147 680 156 660 Z', 'M215 662 C236 667 255 689 264 720 C272 754 271 795 258 818 C244 822 234 799 231 773 C235 733 229 692 215 662 Z', 'M396 662 C375 667 356 689 347 720 C339 754 340 795 353 818 C367 822 377 799 380 773 C376 733 382 692 396 662 Z', 'M455 660 C442 653 427 652 416 660 C406 685 405 724 413 761 C419 785 429 802 441 807 C453 796 459 776 462 751 C466 716 464 680 455 660 Z'] },
  { zone: 'calves', side: 'back', regions: ['outer-left', 'inner-left', 'inner-right', 'outer-right'], paths: ['M150 858 C134 881 123 914 124 948 C126 976 138 999 152 1010 C162 993 171 975 173 956 C172 920 164 881 150 858 Z', 'M184 858 C198 870 207 900 207 934 C206 964 194 991 180 1009 C178 991 177 974 179 957 C182 923 179 883 184 858 Z', 'M427 858 C413 870 404 900 404 934 C405 964 417 991 431 1009 C433 991 434 974 432 957 C429 923 432 883 427 858 Z', 'M461 858 C477 881 488 914 487 948 C485 976 473 999 459 1010 C449 993 440 975 438 956 C439 920 447 881 461 858 Z'] },
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
            {shape.paths.map((path, index) => <path key={`hit-${path}`} className={styles.hitArea} d={path} data-hit-area="true" data-region={shape.regions?.[index]} aria-hidden="true" focusable="false" />)}
            {shape.paths.map((path, index) => <path key={`shape-${path}`} className={styles.zoneShape} d={path} data-visual-shape="true" data-region={shape.regions?.[index]} aria-hidden="true" focusable="false" />)}
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
