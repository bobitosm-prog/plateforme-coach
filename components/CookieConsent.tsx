'use client';

/**
 * CookieConsent — v3 Minimal Premium
 * Conforme nLPD CH + RGPD UE
 *
 * Philosophie design : less is more.
 * - Beaucoup d'air (p-8 sm:p-10)
 * - Hiérarchie typographique discrète (titre label-style)
 * - Pas d'icônes décoratives, pas de glow gratuit
 * - Accent gold ultra-subtil en top (1px gradient)
 * - Animation slide-up à l'apparition (400ms)
 * - Layout desktop : Customize à gauche, actions à droite
 * - Layout mobile : tout empilé, CTA en haut (col-reverse)
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import styles from './CookieConsent.module.css';

// === TYPES ===

export type ConsentChoice = {
  necessary: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  timestamp: number;
  version: '2.0';
};

const COOKIE_NAME = 'moovx_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 12 mois
const CONSENT_VERSION = '2.0';

// === HELPERS ===

export function getConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  // A host-only v1 cookie may coexist with the shared-domain v2 cookie.
  for (const entry of document.cookie.split('; ')) {
    if (!entry.startsWith(`${COOKIE_NAME}=`)) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(entry.slice(COOKIE_NAME.length + 1))) as ConsentChoice;
      if (parsed.version === CONSENT_VERSION && typeof parsed.marketing === 'boolean') return parsed;
    } catch {
      // Ignore malformed or obsolete consent records.
    }
  }
  return null;
}

function setConsent(choice: Omit<ConsentChoice, 'timestamp' | 'version'>) {
  const previous = getConsent();
  const full: ConsentChoice = {
    ...choice,
    necessary: true,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
  // Remove the former host-only cookie before sharing consent across moovx.ch and app.moovx.ch.
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax; Secure`;
  const domain = location.hostname === 'moovx.ch' || location.hostname.endsWith('.moovx.ch')
    ? '; domain=moovx.ch' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(full)
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure${domain}`;
  window.dispatchEvent(new CustomEvent('moovx-consent-changed', { detail: full }));
  // A loaded third-party script cannot be unloaded; refresh after withdrawing permission.
  if (previous?.marketing && !full.marketing) window.location.reload();
}

export function useConsent(): ConsentChoice | null {
  const [consent, setConsentState] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    setConsentState(getConsent());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ConsentChoice>).detail;
      setConsentState(detail);
    };
    window.addEventListener('moovx-consent-changed', handler);
    return () => window.removeEventListener('moovx-consent-changed', handler);
  }, []);

  return consent;
}

// === COMPOSANT PRINCIPAL ===

export default function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const locale = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        requestAnimationFrame(() => setIsMounted(true));
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setAnalytics(existing.analytics);
      setFunctional(existing.functional);
      setMarketing(existing.marketing);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const existing = getConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setFunctional(existing.functional);
        setMarketing(existing.marketing);
      }
      setShowCustomize(true);
      setIsVisible(true);
      requestAnimationFrame(() => setIsMounted(true));
    };
    window.addEventListener('moovx-open-consent', handler);
    return () => window.removeEventListener('moovx-open-consent', handler);
  }, []);

  const handleClose = (callback: () => void) => {
    setIsMounted(false);
    setTimeout(() => {
      callback();
      setIsVisible(false);
      setShowCustomize(false);
    }, 300);
  };

  const handleAcceptAll = () =>
    handleClose(() => setConsent({ necessary: true, analytics: true, functional: true, marketing: true }));
  const handleDeclineAll = () =>
    handleClose(() => setConsent({ necessary: true, analytics: false, functional: true, marketing: false }));
  const handleSaveCustom = () =>
    handleClose(() => setConsent({ necessary: true, analytics, functional, marketing }));

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className={styles.overlay}
    >
      <div
        className={`${styles.panel} ${isMounted ? styles.entered : styles.leaving}`}
      >
        <div
          className={styles.card}
        >
          {/* Accent gold ultra-fin en top */}
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-60"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #D4A843 50%, transparent 100%)',
            }}
          />

          <div className={styles.content}>
            {!showCustomize ? (
              // ===== VUE PRINCIPALE =====
              <>
                {/* Titre label-style, discret */}
                <h2
                  id="cookie-consent-title"
                  className={styles.title}
                >
                  {t('title')}
                </h2>

                {/* Description : lecture confortable, line-height aéré */}
                <p className={styles.description}>
                  {t('description')}
                </p>

                {/* Boutons : Customize à gauche, actions à droite */}
                <div className={styles.actions}>
                  <button
                    onClick={() => setShowCustomize(true)}
                    className={styles.customize}
                  >
                    {t('customize')}
                  </button>

                  <div className={styles.choices}>
                    <button
                      onClick={handleDeclineAll}
                      className={styles.decline}
                    >
                      {t('necessaryOnly')}
                    </button>

                    <button
                      onClick={handleAcceptAll}
                      className={styles.accept}
                    >
                      {t('acceptAll')}
                    </button>
                  </div>
                </div>

                {/* Liens : très discrets, séparés par espace généreux */}
                <div className={styles.links}>
                  <Link
                    href={`/${locale}/privacy`}
                    className="hover:text-white/60 transition-colors"
                  >
                    {t('links.privacy')}
                  </Link>
                  <span className="text-white/15">·</span>
                  <Link
                    href={`/${locale}/cgu`}
                    className="hover:text-white/60 transition-colors"
                  >
                    {t('links.cgu')}
                  </Link>
                </div>
              </>
            ) : (
              // ===== VUE PERSONNALISATION =====
              <>
                {/* Header avec back button */}
                <div className={styles.customHeader}>
                  <button
                    onClick={() => setShowCustomize(false)}
                    aria-label={t('back')}
                    className={styles.backButton}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h2
                    className={styles.title}
                  >
                    {t('customize')}
                  </h2>
                </div>

                {/* Liste des catégories — espacement généreux */}
                <div className={styles.categoryList}>
                  <CategoryRow
                    title={t('categories.necessary.title')}
                    description={t('categories.necessary.description')}
                    locked
                    lockedLabel={t('categories.necessary.alwaysActive')}
                  />
                  <CategoryRow
                    title={t('categories.functional.title')}
                    description={t('categories.functional.description')}
                    checked={functional}
                    onChange={setFunctional}
                  />
                  <CategoryRow
                    title={t('categories.analytics.title')}
                    description={t('categories.analytics.description')}
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <CategoryRow
                    title={t('categories.marketing.title')}
                    description={t('categories.marketing.description')}
                    checked={marketing}
                    onChange={setMarketing}
                  />
                </div>

                <div className={styles.customActions}>
                  <button
                    onClick={handleSaveCustom}
                    className={styles.save}
                  >
                    {t('save')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// === SOUS-COMPOSANTS ===

/**
 * Une ligne de catégorie : titre + description à gauche, toggle à droite.
 * Pas de bordure, pas de bg — juste de l'espace.
 */
function CategoryRow({
  title,
  description,
  checked,
  onChange,
  locked,
  lockedLabel,
}: {
  title: string;
  description: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  lockedLabel?: string;
}) {
  return (
    <div className={styles.categoryRow}>
      <div className={styles.categoryText}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.categoryControl}>
        {locked ? (
          <span className={styles.categoryLock}>
            {lockedLabel}
          </span>
        ) : (
          <Toggle checked={!!checked} onChange={onChange!} />
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
    >
      <span
        className={styles.toggleThumb}
      />
    </button>
  );
}

// === BOUTON "GÉRER MES COOKIES" pour le Footer ===

export function ManageCookiesButton({ className = '' }: { className?: string }) {
  const t = useTranslations('cookieConsent');
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('moovx-open-consent'))}
      className={`underline-offset-4 hover:underline hover:text-white/80 transition-colors ${className}`}
    >
      {t('manageCookies')}
    </button>
  );
}
