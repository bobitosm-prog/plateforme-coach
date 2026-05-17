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

// === TYPES ===

export type ConsentChoice = {
  necessary: true;
  analytics: boolean;
  functional: boolean;
  timestamp: number;
  version: '1.0';
};

const COOKIE_NAME = 'moovx_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 12 mois
const CONSENT_VERSION = '1.0';

// === HELPERS ===

export function getConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as ConsentChoice;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setConsent(choice: Omit<ConsentChoice, 'timestamp' | 'version'>) {
  const full: ConsentChoice = {
    ...choice,
    necessary: true,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(full)
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent('moovx-consent-changed', { detail: full }));
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
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const existing = getConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setFunctional(existing.functional);
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
    handleClose(() => setConsent({ necessary: true, analytics: true, functional: true }));
  const handleDeclineAll = () =>
    handleClose(() => setConsent({ necessary: true, analytics: false, functional: true }));
  const handleSaveCustom = () =>
    handleClose(() => setConsent({ necessary: true, analytics, functional }));

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-4 sm:pb-6 pointer-events-none"
    >
      <div
        className={`
          pointer-events-auto
          w-full max-w-xl
          transition-all duration-400 ease-out
          ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
        style={{ transitionDuration: '400ms' }}
      >
        <div
          className="
            relative overflow-hidden
            bg-black/95 backdrop-blur-xl
            border border-white/[0.08]
            rounded-xl
          "
          style={{
            boxShadow:
              '0 1px 0 0 rgba(212, 168, 67, 0.1) inset, 0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 8px 24px -8px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Accent gold ultra-fin en top */}
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-60"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #D4A843 50%, transparent 100%)',
            }}
          />

          <div className="px-8 py-7 sm:px-12 sm:py-10">
            {!showCustomize ? (
              // ===== VUE PRINCIPALE =====
              <>
                {/* Titre label-style, discret */}
                <h2
                  id="cookie-consent-title"
                  className="
                    text-[11px] sm:text-xs
                    uppercase tracking-[0.2em]
                    text-[#D4A843]
                    font-semibold
                    mb-4
                  "
                >
                  {t('title')}
                </h2>

                {/* Description : lecture confortable, line-height aéré */}
                <p className="text-white/75 text-[15px] leading-[1.65] mb-8 max-w-md">
                  {t('description')}
                </p>

                {/* Boutons : Customize à gauche, actions à droite */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                  <button
                    onClick={() => setShowCustomize(true)}
                    className="
                      sm:mr-auto
                      text-white/55 hover:text-white
                      text-sm transition-colors
                      py-2 -mx-1 px-1
                      underline-offset-4 hover:underline
                      text-left sm:text-center
                    "
                  >
                    {t('customize')}
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDeclineAll}
                      className="
                        flex-1 sm:flex-initial
                        border border-white/15 hover:border-white/30
                        bg-transparent hover:bg-white/[0.04]
                        text-white/85 font-medium
                        px-5 py-3 rounded-lg
                        text-sm
                        transition-all
                      "
                    >
                      {t('necessaryOnly')}
                    </button>

                    <button
                      onClick={handleAcceptAll}
                      className="
                        flex-1 sm:flex-initial
                        bg-[#D4A843] hover:bg-[#E5BC56]
                        text-black font-semibold
                        px-6 py-3 rounded-lg
                        text-sm
                        transition-all
                      "
                    >
                      {t('acceptAll')}
                    </button>
                  </div>
                </div>

                {/* Liens : très discrets, séparés par espace généreux */}
                <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
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
                <div className="flex items-center gap-3 mb-7">
                  <button
                    onClick={() => setShowCustomize(false)}
                    aria-label={t('back')}
                    className="
                      -ml-2
                      w-9 h-9 flex items-center justify-center rounded-lg
                      text-white/50 hover:text-white hover:bg-white/[0.04]
                      transition-all
                    "
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
                    className="
                      text-[11px] sm:text-xs
                      uppercase tracking-[0.2em]
                      text-[#D4A843]
                      font-semibold
                    "
                  >
                    {t('customize')}
                  </h2>
                </div>

                {/* Liste des catégories — espacement généreux */}
                <div className="space-y-5 mb-8 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
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
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={() => setShowCustomize(false)}
                    className="
                      sm:mr-auto
                      text-white/55 hover:text-white
                      text-sm transition-colors
                      py-2 -mx-1 px-1
                      underline-offset-4 hover:underline
                      text-left sm:text-center
                    "
                  >
                    {t('back')}
                  </button>
                  <button
                    onClick={handleSaveCustom}
                    className="
                      bg-[#D4A843] hover:bg-[#E5BC56]
                      text-black font-semibold
                      px-6 py-3 rounded-lg
                      text-sm
                      transition-all
                    "
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
    <div className="flex items-start justify-between gap-5">
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-[14px] font-medium mb-1">{title}</h3>
        <p className="text-white/45 text-[13px] leading-[1.6]">{description}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        {locked ? (
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#D4A843]/70 font-medium whitespace-nowrap">
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
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer
        rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[#D4A843]/60 focus:ring-offset-2 focus:ring-offset-black
        ${checked ? 'bg-[#D4A843]' : 'bg-white/[0.12]'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5
          transform rounded-full bg-white shadow
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
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
