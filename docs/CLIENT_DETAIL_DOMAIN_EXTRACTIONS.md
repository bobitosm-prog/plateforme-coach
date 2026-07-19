# Frontières métier de `useClientDetail`

## Contrat et autorité

`useClientDetail` conserve son export, ses constantes et toutes les clés
consommées par `client/[id]/page.tsx`. L'ID de route est uniquement la cible.
`loadClientDetailProfile` dérive le coach avec `IdentityRepository.getCurrent`,
exige `findActiveBetween`, puis lit la projection explicite
`active_related_profiles`. Une relation inactive, étrangère ou invisible est
retournée comme `forbidden` sans permettre de distinguer l'existence du profil.

Les résultats distinguent `success`, `anonymous`, `forbidden`, `not_found` et
`unavailable`. Les erreurs SQL/Supabase ne traversent pas la frontière. Aucun
cache n'existait dans le hook : aucun cache non owner/target-scoped n'a été
introduit. Une génération de chargement invalide les réponses après changement
rapide de client ou démontage.

## Quatre frontières

- **Profil** (`profile.ts`) : identité, relation active, projection client sûre,
  notes coach, RPC `update_active_client_profile` et ajout de poids. Les champs
  Stripe, rôle et abonnement autoritaires sont absents de la projection et des
  mutations typées.
- **Training** (`training.ts`) : programmes assignés, programmes personnels
  legacy valides, templates coach, séances terminées et sauvegarde du snapshot
  hebdomadaire. Les repositories Training sont réutilisés lorsque leur contrat
  est équivalent. La lecture personnelle conserve explicitement le tri legacy
  `created_at DESC` et la limite 10 plutôt que le tri repository `updated_at`;
  `workout_sessions` et `completed_sessions` ne sont jamais fusionnés.
- **Nutrition** (`nutrition.ts`) : plan coach, plan personnel IA et suivi repas
  hebdomadaire, puis sauvegarde parallèle plan/objectifs conservant l'échec
  partiel historique. Les champs legacy `plan_data`, `is_active`,
  `is_completed` et les cibles macros restent explicitement isolés, car ils
  divergent encore des types canoniques documentés.
- **Progression** (`progression.ts`) : 90 poids, 10 mensurations, 20 photos
  signées et 50 marqueurs de complétion du coach actif. Le read model
  Progression assure le tri sans transformer absence ou panne en zéro.

## Architecture finale de la façade

- `useClientDetail.ts` (5 lignes) conserve uniquement l'export par défaut et
  les réexports publics historiques.
- `client-detail-contract.ts` (69 lignes) porte types, constantes, valeurs
  initiales et normalisation legacy sans effet React ou accès aux données.
- `useClientDetailController.ts` (456 lignes) coordonne les quatre domaines,
  les états UI, les mutations existantes et compose strictement l'objet public.
- `useClientDetailAi.ts` (129 lignes) isole les deux flux IA, leurs états et les
  accès alimentaires legacy. Le transport, les routes, prompts, paramètres et
  textes d'erreur restent inchangés.
- `useClientDetailResources.ts` (88 lignes) orchestre messaging/realtime et la
  bibliothèque d'exercices. Les projections catalogue sont désormais
  explicites; le repository et l'adaptateur realtime existants sont réutilisés.

Le changement rapide de cible invalide toujours les quatre chargements. Le
lifecycle messaging invalide les conversations obsolètes, détruit le channel
au changement de relation ou démontage et annule le debounce de recherche.
La progression reste non bloquante.

## Mesures et compatibilité

| Mesure | Avant | Après |
|---|---:|---:|
| lignes `useClientDetail.ts` | 810 | 5 |
| plus grande frontière interne | 810 | 456 |
| dette ESLint de la façade/orchestration | 30 erreurs / 2 avertissements | 13 erreurs / 0 avertissement |

Les limites, tris et formes visibles restent : 100 séances, 10 programmes
personnels, 90 poids, 10 mensurations, 20 photos, 50 complétions et 200 lignes
de suivi repas. La progression conserve son chargement non bloquant après le
profil, Training et Nutrition. Les valeurs Nutrition legacy, les deux
historiques Training, les notifications et le contrat UI ne sont pas
normalisés ou fusionnés.

## Dette reportée

Le contrôleur conserve les actions profil/programme/nutrition, les éditeurs
temporaires, 12 occurrences historiques de `any` sur les formes distantes
legacy et une erreur historique `set-state-in-effect`. Le client navigateur
partagé et les lectures IA de colonnes Nutrition
divergentes restent bornés aux frontières existantes. Les notes sont toujours
autosauvegardées après trois secondes et le suivi hebdomadaire reste interrogé
toutes les trente secondes. Ces comportements n'ont pas été modifiés.

La prochaine tâche peut découper `coach/page.tsx` en sections chargées à la
demande; aucune modification de `client/[id]/page.tsx` n'a été nécessaire.
