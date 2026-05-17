-- Sprint 4b — Langue préférée user
-- Ajoute la colonne preferred_locale à profiles pour persistance cross-device

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'fr' NOT NULL
  CHECK (preferred_locale IN ('fr', 'en', 'de'));

COMMENT ON COLUMN public.profiles.preferred_locale IS
  'Locale préférée user (fr/en/de). Synchronisée avec cookie NEXT_LOCALE. Sprint 4b MoovX.';

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_locale
  ON public.profiles (preferred_locale);
