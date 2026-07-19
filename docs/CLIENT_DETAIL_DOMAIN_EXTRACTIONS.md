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

Messaging continue d'utiliser le repository, le service et l'adaptateur
Realtime existants. Les accès exercices, génération IA, notes autosauvegardées
et certaines mutations de présentation restent dans le hook pour la prochaine
réduction de façade.

## Mesures et compatibilité

| Mesure | Avant | Après |
|---|---:|---:|
| lignes `useClientDetail.ts` | 847 | 810 |
| accès directs Supabase/RPC/storage dans le hook | 35 | 11 |
| dette ESLint du hook | 33 erreurs / 3 avertissements | 30 erreurs / 2 avertissements |

Les limites, tris et formes visibles restent : 100 séances, 10 programmes
personnels, 90 poids, 10 mensurations, 20 photos, 50 complétions et 200 lignes
de suivi repas. La progression conserve son chargement non bloquant après le
profil, Training et Nutrition. Les valeurs Nutrition legacy, les deux
historiques Training, les notifications et le contrat UI ne sont pas
normalisés ou fusionnés.

## Dette reportée

La façade reste volontairement au-dessus de 250 lignes. La génération IA,
l'éditeur d'exercices/variantes, les états React, les mutations restantes et le
client navigateur partagé seront découpés par la tâche suivante. Les
divergences Nutrition distantes ne doivent pas être masquées par une migration
de types ou une hypothèse de colonne.
