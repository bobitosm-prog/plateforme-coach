# Architecture de la page détail client

## Contrat préservé

La route `client/[id]` reste une cible, jamais une preuve d'autorité. La façade
appelle exclusivement `useClientDetail`, qui conserve la dérivation de
l'identité coach, la vérification de relation active, les chargements et le
cycle de vie Messaging. Les états chargement, erreur et profil invisible
restent distingués; le texte legacy `Client introuvable` et le retour coach
sont inchangés.

L'ordre des onglets reste : aperçu, programme, progression, nutrition,
messages, notes. Les vues existantes reçoivent exactement les données et
callbacks publics du hook. Les formats Training/Nutrition legacy, l'ordre des
écritures, les notifications et les rafraîchissements ne sont pas transformés.

## Frontières

| Frontière | Responsabilité | Lignes |
|---|---|---:|
| `page.tsx` | hook, états globaux, template Nutrition, composition | 31 |
| `ClientDetailPageView.tsx` | sidebar, headers, navigation et six sections | 314 |
| `ClientDetailPageOverlays.tsx` | profil, catalogue d'exercices, génération IA et confirmation template | 315 |
| `ClientDetailPageStates.tsx` | chargement et indisponibilité | 15 |
| `client-detail-page-types.ts` | contrat typé partagé | 8 |

Les composants de présentation ne créent aucun client Supabase, n'importent
aucun repository et ne prennent aucune décision d'autorité. Les trois overlays
conservent leur backdrop, animation, fermeture, état mobile et callbacks. Une
seule instance de `useClientDetail` existe dans la façade.

## Mesures et validation

La page passe de 660 à 31 lignes. Sa dette ESLint passe de 4 erreurs et
3 avertissements historiques à zéro. Toutes les frontières restent sous
500 lignes. Les gardes statiques figent les tailles, l'ordre des onglets, les
six sections, les overlays et l'absence d'import de données; le rendu serveur
caractérise les états chargement et indisponible.

## Dette reportée

Les composants métier existants restent volumineux, notamment
`ClientNutrition`, et les overlays profil/catalogue/IA restent une composition
visuelle dense. Les formes distantes legacy et la dette du contrôleur
`useClientDetailController` ne sont pas corrigées ici. La prochaine tâche est
la pagination des listes coach importantes.
