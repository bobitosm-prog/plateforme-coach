# MoovX — Session Log

Historique des sessions de developpement marathon.

---

## 2026-05-21 — Sprint Launch Prep Phase 2 RLS audit Tier 1 (~1h)

### Objectif
Auditer les Row Level Security policies Supabase sur les tables
sensibles avant ouverture aux beta testers. Identifier et fixer
toute fuite de données cross-tenant (coach A peut lire les
données du coach B, etc.).

### Methode

Tier-based audit (1h timeboxé) :
- Tier 1 (critique RGPD) : profiles, payments, progress_photos,
  body_measurements, messages, coach_clients, bug_reports,
  push_subscriptions
- Tier 2 (personnel mais moins sensible) : à auditer prochaine session
- Tier 3 (référence) : à skim plus tard

Approche read-only : SQL d'introspection sur pg_tables et pg_policies,
analyse manuelle des USING/WITH CHECK clauses, identification des
patterns dangereux (USING: true, predicats trop larges).

### Findings

Inventaire général :
- 57 tables dans le schéma public
- 57/57 ont RLS active (très bonne hygiène générale)
- ~170 policies au total
- 2 tables avec RLS=true et 0 policies (volontaire : meal_plans_backup_*,
  stripe_webhook_events accédé uniquement via service_role)

### 2 bugs critiques détectés (data leak direct)

Bug #1 — progress_photos
- Policy : "coach read photos" (SELECT, public)
- USING : true
- Effet : tout utilisateur authentifié pouvait SELECT * sur
  TOUTES les photos de progression (transformations corporelles)
- Sévérité : RGPD/nLPD majeur (données de santé)

Bug #2 — body_measurements
- Policy : "coach read measurements" (SELECT, authenticated)
- USING : true
- Effet : tout utilisateur authentifié pouvait SELECT * sur
  TOUTES les mesures corporelles (poids, taille, % graisse)
- Sévérité : RGPD/nLPD majeur (données de santé)

Cause racine probable : doublon défectueux laissé en place lors
d'une migration antérieure. Chaque table avait déjà une policy
correcte (progress_photos_coach_read, body_measurements_coach_read)
faisant le bon check via coach_clients lookup, mais une second
policy avec USING: true coexistait. Logique PERMISSIVE additive
PostgreSQL = la plus permissive gagne.

### Fix appliqué

Migration : supabase/migrations/20260521203522_drop_insecure_rls_policies.sql

DROP POLICY IF EXISTS "coach read photos" ON public.progress_photos;
DROP POLICY IF EXISTS "coach read measurements" ON public.body_measurements;

Pas de REPLACE nécessaire : les policies correctement scopées
existent déjà sur les deux tables.

Application : SQL Editor Supabase, validation par re-run de
l'audit pg_policies.

Validation post-fix :
- progress_photos : 6 policies (était 7), policy correcte intacte
- body_measurements : 5 policies (était 6), policy correcte intacte
- Cross-tenant SELECT bloqué au niveau PostgreSQL

### Bugs moyens détectés (non-fixés ce sprint)

Bug #3 — coach_clients self-insert
- Policies : "Clients can be assigned" + "clients can insert themselves"
- Effet : un user authentifié peut s'auto-déclarer client de
  N'IMPORTE QUEL coach (INSERT avec WITH CHECK auth.uid()=client_id,
  pas de vérif sur coach_id existant ou consenting)
- Impact : pas de leak de données (l'attaquant ne lit pas les
  données du coach), mais pollution table coach_clients,
  apparition potentielle sur dashboard coach victime, potentiellement
  déclenchement de notifications
- À traiter dans session ultérieure (~15-20 min, demande réflexion archi)

### Dette cosmétique RLS (P2)

Doublons de policies sur la plupart des tables Tier 1 (ex:
body_measurements_own + own measurements + users manage own
measurements font la même chose). Restes de migrations successives.
Pas un bug, mais maintenance lourde. À nettoyer dans une session
dédiée "RLS cleanup" (~1h).

Roles incohérents : mix {public} et {authenticated} sur la même
table. {public} inclut anon, mais auth.uid() retourne NULL pour
anon donc effective. Sale mais pas dangereux.

### Apprentissages senior consignés

Pattern dangereux à chercher en audit RLS : USING: true (policy
qui désactive effectivement le check pour SELECT). Toujours vérifier
les colonnes using_clause et with_check du dump pg_policies.

Tier-based audit > exhaustive audit en time-boxed session :
prioriser sur la sensibilité des données et la surface d'attaque,
pas sur le nombre de tables.

PERMISSIVE est additive en PostgreSQL : si N policies existent
pour une commande sur une table, l'utilisateur peut effectuer
l'action si AU MOINS UNE le permet. Donc une policy défectueuse
USING: true à côté d'une policy correcte = la défectueuse gagne.

### Decisions architecturales

- Migration versionnée dans le repo (supabase/migrations/) plutôt
  que SQL ad-hoc dans le SQL Editor. Trace Git, reproductibilité,
  audit RGPD facilité.
- DROP plutôt que REPLACE : les policies correctes existent déjà,
  on ne remplace pas une policy défectueuse par une autre.
- Application via SQL Editor (Option A) plutôt que supabase CLI db
  push (Option B) : 0 risque d'effet de bord sur autres migrations
  en attente.

### Reste à faire — Phase 2 partie 2 (cette session ou suivante)

- Tester cross-tenant SQL sur les 17 tables Tier 2 (~30 min)
- Si bugs trouvés : fix selon même pattern que Tier 1

### Reste à faire — Phase 3 (~1.5h, prochaine session)

- Migration delete_user_account(uuid) PL/pgSQL transactionnelle
- Refacto route API pour appeler le RPC
- Tests rollback

### Commits

| # | Hash | Description |
|---|---|---|
| 1 | a337951 | fix(rls): drop 2 insecure policies leaking sensitive data |

---

## 2026-05-20 — Sprint Launch Prep Phase 1 COMPLETE (~3h)

### Objectif
Finaliser le split landing/app entre moovx.ch (marketing) et app.moovx.ch
(app authentifiée). Suite directe de la session 19 mai.

### Realisations

1.D.2 — Câblage host-redirect (commit 093605a, fin session 19/05)

1.D.3.a — Skip Supabase pour routes API et statiques (commit ea16d0f)
- Early return dans proxy() pour /api/*, /_next/*, /sitemap.xml, /robots.txt
- Évite getSession() redondant sur routes API qui gèrent leur auth en handler
- Évite que les webhooks Stripe (sans cookie auth) déclenchent du boulot Supabase
- Dédup const pathname

1.D.3.b — Matcher étendu (commit ec25bcf)
- AVANT : matcher ['/', '/coach/:path*', '/client/:path*']
- APRÈS : match toutes routes sauf assets statiques (regex inversée)
- Active enfin le redirect host-based sur /login, /register-client,
  /onboarding*, /admin/*, /paywall

1.E-1.G — Config externe
- Cloudflare DNS : CNAME app vers Vercel — déjà configuré
- Vercel : app.moovx.ch attaché, SSL valid — déjà configuré
- Supabase : Site URL https://app.moovx.ch, Redirect URLs incluent
  https://app.moovx.ch/** et https://moovx.ch/** (safety net)

1.H — Validation E2E prod
- 5 tests curl automatisés tous verts
- 5 scénarios navigateur manuels tous verts

### Bug prod détecté + fix immédiat

Symptôme : user change langue sur landing (DE), navigue vers
app.moovx.ch/login, page login en FR au lieu de DE.

Root cause : Navbar.tsx ligne 22 posait NEXT_LOCALE via document.cookie
brut, sans attribut domain. Cookie host-only sur moovx.ch, invisible
depuis app.moovx.ch.

Fix (commit 21cf850) : ajout conditionnel domain=moovx.ch + Secure
en prod, même pattern que routes API patchées en 1.C (commit 48b4cd6).

Validation DevTools post-fix :
- Domain : .moovx.ch (avec point devant = cross-subdomain)
- Secure : oui
- Page login s'affiche désormais en DE après changement langue landing

### Apprentissage senior consigné

Les tests curl ne remplacent pas un test E2E navigateur pour les
changements touchant cookies, redirects, ou état navigateur. Scénario 4
(validation manuelle) a détecté un bug invisible aux 10 tests curl
automatisés.

### Decisions architecturales

- Skip API du middleware : /api/* gère son auth en handler. Économie
  5-20ms par requête + évite Stripe webhooks de déclencher du boulot inutile.
- Matcher regex inversée : pattern Next.js standard, plus maintenable.
- Cookie set client harmonisé avec serveur : même garde-fou NODE_ENV.

### Reste à faire — Phase 2 et 3 du Sprint Launch Prep

- Phase 2 : RLS audit Supabase
- Phase 3 : Delete account RPC transactionnel

### Dette technique consciente (rappel)

- Bug pré-existant proxy.ts : early-returns redirects ne portent pas
  les cookies Supabase mis à jour. Race condition rare.
- 4 stashes Git accumulés. Session "git hygiene" 15 min à planifier.
- Cas app.moovx.ch/ non loggué : 2 redirects au lieu d'1.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | ea16d0f | feat(proxy): skip middleware for API and static routes |
| 2 | ec25bcf | feat(proxy): broaden matcher to all routes except static assets |
| 3 | 21cf850 | fix(i18n): share NEXT_LOCALE cookie from landing navbar |

---

## 2026-05-19 — Sprint Launch Prep Phase 1 (Domain Split) — partial (~3h)

### Objectif
Préparer le split landing/app entre `moovx.ch` (marketing) et
`app.moovx.ch` (app authentifiée). Phase 1 sur 3 du sprint Launch Prep.

### Realisations (Phase 1.A → 1.D.1)

**1.A — Refacto SEO**
- `lib/seo.ts` : `SITE_URL` lit `NEXT_PUBLIC_SITE_URL` avec fallback `https://moovx.ch`
- Symétrie avec `NEXT_PUBLIC_APP_URL`

**1.B — Env vars**
- Ajout `NEXT_PUBLIC_SITE_URL=https://moovx.ch` dans `.env.example`,
  `.env.local`, Vercel (production + preview + development)
- Validé localement : `curl /sitemap.xml` retourne bien `https://moovx.ch`

**1.C — Cookie NEXT_LOCALE cross-subdomain**
- Décision stratégique : auth Supabase **isolée** par host (least privilege),
  `NEXT_LOCALE` **partagé** sur `.moovx.ch` (UX cohérente)
- Patch 2 routes : `app/api/user/locale/route.ts` + `app/api/user/sync-locale/route.ts`
- Pattern : `...(NODE_ENV === 'production' && { domain: 'moovx.ch' })`
- Garde-fou localhost preservé (le `domain` n'est posé qu'en prod)
- Validé visuellement DevTools : cookie `Domain=localhost` en dev ✅

**1.D.1 — Helpers proxy host-based (dead code)**
- Constantes `MARKETING_HOSTS = ['moovx.ch', 'www.moovx.ch']`, `APP_HOST`
- Helper pur `isLandingPath()` : détermine si un path appartient à la landing
- Helper pur `getHostRedirect()` : retourne un redirect 308 host-based ou null
- Code mort : helpers pas encore appelés dans le middleware

### Decisions architecturales

- **Routing strategy : Option B** (split `moovx.ch` + `app.moovx.ch`)
  - Pattern standard SaaS, séparation marketing/produit
  - Headers de sécurité plus stricts possibles sur `app.`
- **Cookies** : auth isolée par host, locale partagée cross-subdomain
- **Mécanisme split** : middleware Next.js étendu, pas `next.config.ts` rewrites
  - Centralisé, edge runtime, debug facile
- **Helper séparé** `getHostRedirect()` : code testable mentalement, early-return en début de middleware pour économiser l'init Supabase

### Bug détecté + résolu : transformation Markdown du terminal

Lors de l'écriture du code par Claude Code, la string `'www.moovx.ch'`
a été transformée silencieusement en `'[www.moovx.ch](https://www.moovx.ch)'`
(format Markdown). tsc ne l'attrape pas (string valide), mais à l'exécution
`MARKETING_HOSTS.includes('www.moovx.ch')` aurait retourné false.

Cause racine : terminal/clipboard avec auto-formatting Markdown qui
interprète les URLs au paste.

Fix : édition directe via sed (regex échappée pour ne pas re-pase l'URL).
Validation finale via `od -c` (vue binaire indiscutable).

Apprentissage Senior consigné :
- Pour les strings sensibles (URLs, regex), éviter le paste depuis Markdown
- Pour valider un fichier en cas de doute, utiliser `od -c` ou `xxd`
- Ne pas faire confiance à Claude Code quand il dit "le fichier est correct"
  alors qu'on doute : valider au niveau binaire

### Reste à faire — Phase 1 (prochaine session ~2-3h)

- [ ] **1.D.2** Câbler `getHostRedirect()` en tout début du middleware (early return)
- [ ] **1.D.3** Étendre le matcher du middleware avec regex inversée
      (`/((?!_next/static|_next/image|favicon.ico|...).*)`)
- [ ] **1.D.4** Tests locaux via `curl -H "Host: app.moovx.ch"` (simulation)
- [ ] **1.E** Config Cloudflare DNS : CNAME `app` → `cname.vercel-dns.com`
- [ ] **1.F** Config Vercel : ajouter `app.moovx.ch` dans Domains
- [ ] **1.G** Config Supabase : Redirect URLs + CORS pour `https://app.moovx.ch`
- [ ] **1.H** Validation prod : magic link, login, paywall Stripe end-to-end

### Reste à faire — Phase 2 (Sprint Launch Prep)

- [ ] **Phase 2** : RLS audit Supabase (script SQL cross-tenant)
- [ ] **Phase 3** : Delete account RPC transactionnel (15+ tables)

### Dette technique consciente

- **Bug pré-existant proxy.ts** : early-returns (lignes 65, 77, 81, 84, 95, 108, 109)
  créent un `NextResponse.redirect()` qui ne porte pas les cookies Supabase
  mis à jour. Race condition rare (refresh token pendant redirect → re-login).
  À traiter dans un sprint dédié `fix(proxy): preserve auth cookies in redirects`.
- **4 stashes Git accumulés** (`stash@{0..3}`) — 1 récent + 3 anciens.
  Session "git hygiene" 15 min à planifier (revue + drop ou apply).
- **Cas `app.moovx.ch/` non loggué** non géré : redirige vers `/fr/landing`
  sur `app.moovx.ch` au lieu de `moovx.ch`. Pas bloquant, à traiter avec un
  redirect aval dans 1.D.2.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 59e1c75 | config(env): add NEXT_PUBLIC_SITE_URL |
| 2 | a15dfaa | refactor(seo): SITE_URL reads env var with fallback |
| 3 | 48b4cd6 | feat(cookies): share NEXT_LOCALE across .moovx.ch subdomains |
| 4 | 2878578 | feat(proxy): add host-based redirect helpers (dead code) |

### Stash mis de côté
- `stash@{0}` (créé aujourd'hui) : suppression de 9 fichiers vidéo curl
  dans `public/videos/exercises/` (vidéos servies depuis Supabase Storage
  depuis hier soir, fichiers locaux obsolètes) + `.claude/settings.local.json`,
  `.exercise-media-sync.json`, `package-lock.json`.
  À traiter dans un commit dédié `chore(videos): remove local files migrated to Supabase Storage`.

---

## 2026-05-18 — Performance + i18n Sprint 5A-5J (~8h)

### Sprint Performance (~2h)
- Score mobile 53 → 70, desktop 80 → 96
- TBT 590 → 35ms (-94%)
- Desktop LCP 2.1s → 0.54s
- Hero converti Server Component (texte SSR, hydration decouplee du LCP)
- AVIF config (active sur upgrade Vercel Pro, WebP -99% en attendant)
- RUM via /api/vitals + useReportWebVitals

### Sprints i18n (10 sprints, 1050 cles × 3 langues)
- 5A Onboarding Coach : 83 cles
- 5B Paywall : 49 cles + nouveau pattern ClientIntlProvider
- 5C ProfileTab : 86 cles + delete account localise + locale-aware dates
- 5D ChatTab Athena : 33 cles + prompts localises front
- 5F TrainingTab couche 1 : 36 cles (parent + 4 sub-components)
- 5G ProgressTab : 23 cles
- 5H NutritionTab couche 1 : 31 cles
- 5I Dashboard Coach : 23 cles
- 5J HomeTab couche 1 : 23 cles (cards + quotes + date locale)
- Fix critique 0e8f856 : ClientIntlProvider wraps tout l'app shell

### Crash + Fix critique
Root cause : useTranslations() appele sans ClientIntlProvider parent.
Fix : ClientIntlProvider wraps tout l'app shell (app/page.tsx).
Script prevention : npm run i18n:check (scripts/check-i18n.mjs).

### Progression cumulative i18n
Avant : 18% (6 ecrans, 246 cles)
Apres : ~48% (15 ecrans, 1050 cles)
Funnel acquisition i18n complet ✅
Funnel paid lifecycle i18n complet ✅
Funnel coach onboarding + dashboard i18n complet ✅

### Dette technique consciente
- Couches 2/3 tabs Training, Nutrition, Progress, Home → Sprint 6
- BadgesModal, BadgeCelebration → Sprint 6
- Client view detaillee coach (~660 lignes) → Sprint 6
- Noms exercices/aliments DB en FR → migration dediee
- Motivational quotes HomeTab : 3 categories × 15 quotes FR — EN/DE traduits (indexed)

### Fixes session tardive (19h-20h30)

Bug exercise videos :
- Diagnostic : 34/59 exos sans match en DB (58%)
- Root cause : IA genere des variants ("Hip Thrust Unilateral") sans match exact
- Fix 1 : lib/exercise-matching.ts — normalize + prefix fallback + copie video_url
- Fix 2 : INSERT 25 exos parents manquants en DB
- Fix 3 : CSP media-src etendu a Supabase Storage
- Fix 4 : script enrich-parent-exercises.mjs — 9 parents enrichis avec videos locales

Bilan media : 42% → 85% couverture exercises

### Commits session tardive
| # | Hash | Description |
|---|---|---|
| 1 | b959de8 | fix(exercises): fuzzy match + copy video_url |
| 2 | c2169c3 | data(exercises): add 25 missing parent exercises |
| 3 | 9defb8d | fix(csp): allow media from supabase storage |
| 4 | 2202e1e | feat(media): one-shot script to enrich parent exercises |

---

## 2026-05-18 — (superseded by consolidated entry above)

---

## 2026-05-17 — Sprint 4b LocaleSelector

Selecteur de langue persistant dans Compte > Preferences de l'app authentifiee.

Stack :
- Migration profiles.preferred_locale (text fr/en/de, default 'fr', CHECK, index)
- API POST /api/user/locale : switch (DB update + cookie sync 12 mois)
- API POST /api/user/sync-locale : POST au login (DB → cookie, cross-device)
- Composant LocaleSelector dans Compte > Preferences (section expandable)

Limitation : l'app authentifiee reste FR hardcode (134 fichiers Sprint 5+).
Le LocaleSelector affecte : 6 ecrans auth Sprint 4 + landing publique.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 62ade68 | feat(i18n): persistance langue user via profiles.preferred_locale |
| 2 | 403299f | feat(i18n): LocaleSelector dans Compte > Preferences |

---

## 2026-05-17 — Sprint 4 i18n Critical Path

### Realisations

Infrastructure :
- lib/get-locale.ts + components/AuthIntlProvider.tsx
  → useTranslations() utilisable sur routes hors [locale]
- Pattern split server wrapper + client content

6 ecrans business-critical traduits FR/EN/DE :
- login (21 cles), join (19 cles), register-client (50 cles)
- onboarding (68 cles), onboarding-fitness (62 cles), onboarding-photo (26 cles)
- Total : 246 cles extraites + 492 traductions EN/DE
- 12 ICU variables preservees (firstName, count, coachName, etc.)

Strategie : Option B (wrapper local AuthIntlProvider) plutot que migration structure URL.
Reste FR hardcode (Sprint 5+) : dashboards coach/client, Paywall, admin, profils.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 96cbff5 | feat(i18n): infrastructure i18n pour routes hors [locale] |
| 2 | f5893f2 | feat(i18n): extraction strings auth flow vers namespaces |
| 3 | 3764c7a | feat(i18n): traductions EN + DE pour 246 cles auth |

---

## 2026-05-17 — Sprint 3 Hardening

### Realisations

Infrastructure rate limiting :
- Table ai_usage_logs (RLS, 2 indexes, 2 policies) — migration validee en DB
- Helper lib/rate-limit.ts : checkAiRateLimit + logAiUsage + aiRateLimitResponse
- Fail-open en cas d'erreur DB, headers X-RateLimit-* RFC

Rate limits appliques sur 3 endpoints IA couteux :
- generate-custom-program : 5/h
- analyze-progress-photo : 10/h
- generate-meal-plan : 10/h

Hardening Stripe :
- Connect : idempotency key + DB pre-check + update conditionnel (anti race)
- coach-checkout : validation 30-500 CHF + normalisation 2 decimales

Test runtime valide local : 2 meal-plans generes → 2 entries DB confirmees.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 06b6702 | feat(security): rate limiting infrastructure (Sprint 3) |
| 2 | 8803e5f | feat(security): apply rate limits on 3 expensive AI endpoints |
| 3 | 0e2a4fb | feat(security): Stripe Connect dedup + coach rate validation |

---

## 2026-05-17 — Sprint 2 Legal Safe

### Realisations
- CGU + Privacy multilingues FR/EN/DE (nLPD CH + RGPD UE)
- CookieConsent v3 minimal premium (card flottante centree, animation slide-up 400ms, accent gold)
- AnalyticsGate (Vercel Analytics + SpeedInsights conditionnes au consentement)
- Checkboxes checkout Stripe : acceptCgu + waiveWithdrawal (bloquent CTA)
- Footer locale-aware + ManageCookiesButton
- Migration app/cgu et app/privacy vers app/[locale]/cgu et app/[locale]/privacy
- Convertisseur markdown→HTML lib/markdown.ts (zero dependency, npm cache casse)
- 6 nouvelles routes legales validees en prod
- Strings i18n cookieConsent/legal/footer ajoutees FR/EN/DE

### Iterations design
- v1 : bandeau edge-to-edge (trop large)
- v2 : card flottante max-w-2xl + icone M + glow gold (trop dense)
- v3 : card max-w-xl + titre label uppercase + suppression icone/glow + padding px-12 py-10 (final)

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | e8b4d5e | feat(legal): CGU + Privacy multilingues FR/EN/DE |
| 2 | 3812e44 | feat(legal): CookieConsent v3 minimal + checkboxes Stripe + footer |

---

## 2026-05-17 — Sprint 1 Stripe Live Safe + Security Headers

### Realisations
- Table stripe_webhook_events pour deduplication events Stripe (UNIQUE event_id)
- Webhook handler: dedup, refetch Stripe (defense in depth), return 200 sauf signature invalide
- Checkout: idempotency keys, ordre inverse (Stripe avant DB insert), UUID validation
- Coach checkout: idempotency keys, erreurs sanitizees
- Security headers: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS (prod), Permissions-Policy camera=(self)
- catch (e: unknown) au lieu de any pour type safety

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 48f5e2e | docs: update SESSION_LOG and ROADMAP after SEO waves 1-3 |
| 2 | 07e8ade | feat(security): Sprint 1 — Stripe Live Safe + Security Headers |

---

## Session 2026-05-16 → 2026-05-17 — SEO Technique + Stripe Rebrand

### Objectifs
- Mettre en place SEO multilingue technique de niveau production
- Finaliser le rebrand Coach IA → Athena (cote Stripe Dashboard)

### Realisations

**VAGUE 1 SEO — Detection langue automatique** (commit anterieur)
- proxy.ts detecte la locale via cookie NEXT_LOCALE → Accept-Language → x-vercel-ip-country → fallback fr
- Cookie NEXT_LOCALE persiste le choix au click drapeau

**VAGUE 2 SEO — Hreflang + Sitemap + Robots + OG** (commit fff580a)
- Creation lib/seo.ts (helper centralise: SITE_URL, LOCALES, hreflang builder, OG locale mapping)
- Creation app/sitemap.ts (3 langues × pages avec alternates hreflang)
- Creation app/robots.ts (reference sitemap, disallow auth routes)
- generateMetadata deplace dans app/[locale]/landing/page.tsx (route la plus profonde = priorite Next.js)
- Suppression ancien export const metadata "Coaching Fitness Pro" dans landing/layout.tsx
- Ajout namespace "metadata" dans messages/fr.json + en.json + de.json
- Ajout placeholder og-image.jpg 1200x630
- Suppression des anciens public/sitemap.xml et public/robots.txt (remplaces par routes dynamiques)

**VAGUE 3 SEO — Schema.org structured data** (commit b6fec2d)
- Creation lib/structured-data.ts (helpers types: Organization, LocalBusiness, WebSite, schemaGraph builder)
- Creation components/StructuredData.tsx (composant serveur JSON-LD)
- Injection @graph dans app/[locale]/landing/page.tsx (Organization + HealthAndBeautyBusiness + WebSite)
- SoftwareApplication existant preserve dans landing/layout.tsx
- Coordonnees GPS Geneve (46.2044, 6.1432), areaServed CH/FR/DE
- inLanguage adapte a la locale (fr/en/de)

**Stripe Rebrand Coach IA → Athena**
- Produit Stripe renomme: MoovX Coach IA → MoovX Athena
- Description mise a jour: "Athena, ton coach IA personnel 24/7"
- 3 price IDs preserves (10 CHF/mois, 80 CHF/an, 150 CHF lifetime)
- Product ID inchange: prod_UFWe600xptRDsp
- Aucune modification de code necessaire (la formulation "Coach IA Athena" / "AI Coach Athena" / "KI-Coach Athena" dans les JSON est intentionnelle: nom propre + descripteur)

### Validations
- Schema.org validator: 0 erreur, 0 warning, 3 elements detectes
- Google Rich Results Test: 5 elements valides (Commerces et services, Organisation, Extraits d'avis, Applications logicielles)
- Hreflang Testing Tool: 4 hreflang valides (fr/en/de/x-default), self-referencing OK, 200 OK
- Tests iPhone reel via moovx.ch: tous les flows OK (landing 3 langues, login, register-client)

### Bugs resolus
- Conflit /sitemap.xml entre public/sitemap.xml (statique) et app/sitemap.ts (dynamique) → suppression du statique
- generateMetadata ignore sur /fr/landing (ancien "Coaching Fitness Pro" ecrasait le nouveau) → cause racine: metadata declaree trop haut dans l'arbre de routes Next.js. Fix: deplacer generateMetadata dans la page la plus profonde (landing/page.tsx)

### Fichiers impactes
Crees:
- lib/seo.ts
- lib/structured-data.ts
- components/StructuredData.tsx
- app/sitemap.ts
- app/robots.ts
- public/og-image.jpg (placeholder)

Modifies:
- app/[locale]/landing/page.tsx (generateMetadata + injection StructuredData)
- app/[locale]/landing/layout.tsx (suppression ancien metadata)
- app/[locale]/layout.tsx (retour a l'etat pre-VAGUE 2)
- messages/fr.json, en.json, de.json (namespace metadata)

Supprimes:
- public/sitemap.xml
- public/robots.txt

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 3930bb3 | feat(seo): auto-detect locale on root path + persistent cookie |
| 2 | fff580a | feat(seo): hreflang multilingue + sitemap + robots + OG par locale |
| 3 | b6fec2d | feat(seo): add Organization + LocalBusiness + WebSite JSON-LD schemas |

---

## 14 mai 2026 (nuit) — Refonte Landing Power + Rebrand Athena + i18n Complete

**Duree** : ~10 heures
**Branche** : `main` (deployee)

### Objectifs atteints

1. **Refonte landing direction "Power & Performance"** (14 sections)
2. **Rebrand Coach IA → Athena** (code + a faire Stripe Dashboard)
3. **Architecture i18n complete** avec `next-intl` (FR/EN/DE)
4. **Traduction de 16/17 sections actives** de la landing
5. **Cleanup repo** (14 fichiers `.OLD.tsx` supprimes)

### Sections refondues Power

Direction visuelle inspiree Nike/Whoop/IWC : brutalisme athletique premium, Bebas Neue 200pt, gold #D4A843, viewfinder corners, GSAP ScrollTrigger.

Hero (chalk-athlete) · MarqueeSection · Results (transformation avant/apres) · NutritionSection (bowl) · TrainingSection (runner mountains, PPL table) · TrackingSection (dashboard 3D) · CoachIaSection (iPhone Athena AI + neurones) · CoachingPro (coach tablet) · Geneva (Jet d'Eau sunset) · Testimonials (medaille gold) · Steps (4 corners viseur) · PricingSection · PwaSection · FaqSection · CtaSection (victory)

### Rebrand Athena

- `app/components/tabs/AccountTab.tsx` : label "Coach IA" → "Athena" (Sparkles icon)
- `app/api/stripe/checkout/route.ts` : 3 descriptions PLAN_META
- `app/api/stripe/setup-products/route.ts` : product name
- **TODO manuel** : Stripe Dashboard live → renommer "MoovX Coach IA" → "MoovX Athena"

### Architecture i18n

- **Stack** : `next-intl` 4.12.0
- **Locales** : `fr` (default) · `en` · `de`
- **Routing** : `localePrefix: 'always'` → `/fr/landing` `/en/landing` `/de/landing`
- **Decision** : PAS de `middleware.ts` (conflit `proxy.ts` Next 16). Routing locale via `[locale]`.
- **Trade-off** : pas de redirect auto `/` → `/fr` (a faire dans `proxy.ts` next session)

### Sections i18n traduites

16 sections actives x 3 langues, ~282 cles au total :
Hero (18) · Marquee (1) · Footer (8) · Steps (15) · Navbar (3) · Nutrition (18) · Training (28) · Tracking (20) · CoachIa (20) · Results (14) · CoachingPro (25) · Testimonials (21) · Pwa (26) · Pricing (40) · Faq (17) · Geneva (14) · Cta (14)

EconomicModel SKIP (a refondre Power dans session future)

### Fixes critiques

1. Routing `/landing` → `/fr/landing` : 3 redirects (page.tsx, onboarding, useClientDetail)
2. Mismatch fichiers images : decalage d'un cran fixe via bash mv
3. 12 mismatches code/JSON (Testimonials age/location, Pricing yearly/subtitle/coach naming)
4. Doublon section pricing : EconomicModel commente dans page.tsx

### Decouverte post-session

**Mobile responsive non teste** durant la session. Landing Power = desktop-only.
Priorite #1 session suivante (voir ROADMAP.md).

### TODO immediat

- [ ] Stripe Dashboard live : renommer "MoovX Coach IA" → "MoovX Athena" (5 min manuel)

---

## 14 mai 2026 (soir) — Feedback admin + visibilite in-app

### Livre
- Page /admin/feedback (KPIs + liste filtrable + dialog reply avec form)
- Backend bug-reports : GET (filters/sort) + PATCH (meta) + POST /reply (email branded)
- Helper lib/email.ts partage (SMTP Infomaniak + template HTML gold)
- Hooks useMyFeedback + useMyFeedbackBadge cote client
- API /api/feedback/mine + /api/feedback/mark-all-read (RLS-scoped)
- Page client "Mes rapports" dans AccountTab (badge gold + auto-mark-read)
- BugReport modal universel : 2 tabs (Nouveau / Mes rapports), badge sur bouton flottant
- Audit trail complet (bug_report_update, bug_report_reply dans app_logs)
- Premier email admin → client envoye

### Bugs rencontres et resolus
- RLS bug_reports : admin role 'admin' en DB mais policies sur 'super_admin'
- Zod 4 : chaines .nullable().optional() peu fiables → migre vers z.union explicite
- Postgres CHECK constraints en francais decouvertes a l'execution
- Typo SMTP_USER Vercel : 'noreply.moovx.ch' au lieu de 'noreply@moovx.ch' → fixe
- React StrictMode causait double toast → dedup par id sonner

### Commits
| # | Hash | Description |
|---|---|---|
| 13 | 99da29c | feat(admin): feedback page with branded email reply (FR-aligned schema) |
| 14 | 86460a7 | feat(client+coach): in-app visibility for admin replies on bug reports |

---

## 14 mai 2026 (journee) — Construction console admin

### Contexte initial
- Bug login admin resolu en session precedente (proxy.ts, getRole, SW)
- Console admin basique : seulement 2 comptes affiches (RLS Supabase)
- Mission : vraie console (users / Stripe / logs) + design coach-aligned

### Decouvertes critiques
- bobitosm@gmail.com en DB : `role = 'admin'` (pas `super_admin`, pas `client`)
- RLS profiles cherche `super_admin` → admin "normal" bloque
- Solution : API routes server-side avec service_role, auth par email
- `payments.amount` en francs, `Stripe SDK` en centimes — deux conventions
- Tailwind 4 n'emet pas toujours `lg:pl-[240px]` → migration vers CSS module
- Polices brand : Bebas Neue + Outfit + Barlow Condensed (deja dans globals.css)
- Gold brand `#d4a843` (CSS var `--gold`), pas `amber-400`

### Commits livres (chronologique)
| # | Hash | Description |
|---|---|---|
| 1 | 844c8fc | feat(admin): mutualize supabase clients |
| 2 | badbfef | feat(admin): verifyAdmin + users API routes |
| 3 | f28c20a | feat(admin): stripe stats + payments API routes |
| 4 | 75179a1 | feat(admin): premium console shell + overview KPIs |
| 5 | d2067c6 | fix(admin): correct sidebar overlap and mobile header |
| 6 | (cssfix) | fix(admin): use plain CSS for sidebar offset (T4 compat) |
| 7 | ac04cfc | feat(admin): users management page (search, filters, dialogs) |
| 8 | ef6df1c | feat(admin): revenue dashboard + audit logs pages |
| 9 | c8eea7c | fix(admin): correct currency conversion (cents vs major) |
| 10 | 0b4c428 | feat(admin): show Stripe net revenue + 12-month chart |
| 11 | 8e4e0ee | style(admin): align design system with Coach Pro brand (foundation) |
| 12 | 5989bf8 | style(admin): polish KPI cards, tables and toolbars (brand alignment) |

### Etat architecture
- Backend : `lib/supabase/{client,server,admin}.ts`, `lib/admin/{auth,logger,stripe,types,api-client}.ts`
- API routes : `app/api/admin/{users,users/[id]/role,users/[id]/subscription,stripe/stats,stripe/payments,logs}`
- UI : `app/admin/{layout,page,users,revenue,logs}` + `app/admin/_components/{AdminSidebar,KpiCard,Card,StatusBadge,Modal,RevenueChart,PageHeader,formatters}`
- Design system : `app/admin/admin.css`

### Securite validee
- service_role JAMAIS expose au client (`import 'server-only'`)
- Bearer token + email check sur CHAQUE API admin
- Page /admin guard cote client (UX) + chaque route guard cote serveur (vrai)
- Aucune modification de proxy.ts (flow login preserve)

### Workflow rules
- **Local-first** : `npm run dev` → validation visuelle → commit → push
- Pas de push sans validation utilisateur
- Commits atomiques, messages descriptifs
- tsc clean obligatoire avant commit
