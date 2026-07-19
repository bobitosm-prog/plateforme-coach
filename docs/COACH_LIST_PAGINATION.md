# Pagination des listes coach

## Inventaire et décision

| Liste | Lecture avant | Volume initial | Décision |
|---|---|---:|---|
| Relations clients actives | `coach_clients` puis `active_related_profiles` | 100 + 100 max | Non paginée : annuaire transversal utilisé par messaging, calendrier et affectations; une page partielle masquerait une relation autorisée. |
| Templates Training | `training_programs`, limite 50 | 50 max | **Paginée** : liste visuelle extensible, sans borne métier. |
| Affectations | `client_programs` à l'ouverture de la modale | clients actifs max 100 | Non paginée : projection ponctuelle bornée à l'annuaire; templates et affectations restent séparés. |
| Paiements/revenus | 200 paiements payés | 200 max | Non paginée : agrégat historique, aucune liste de transactions affichée. |
| Rendez-vous | fenêtre calendrier d'une semaine, limite 100 | 100 max/semaine | Non paginée : la semaine constitue la pagination métier; `coach_appointments` reste distinct de `scheduled_sessions`. |
| Sessions complétées | 200 dernières lignes | 200 max | Non paginée : agrégat dernière séance/régularité, sans liste brute visible. |
| Aliments | 50 par défaut, 200 en recherche | 50/200 | Non paginée : catalogue spécialisé déjà borné, hors tâche Coaching. |
| Exercices/feedback | 200 exercices; 20 feedbacks | 200/20 | Non paginée : sources auxiliaires déjà bornées. |
| Messages realtime | contrats 50/100 et delta | borné | Explicitement exclue : lifecycle et pagination appartiennent au module Messaging. |

## Contrat des templates

`listCoachProgramPage` reçoit le coach issu de la session et un `PageRequest`.
La page par défaut contient 20 éléments, avec minimum 1 et maximum 50. Le
repository lit 21 lignes pour calculer `hasMore` et retourne des items
`readonly`, un booléen explicite et un curseur opaque.

L'ordre historique descendant est conservé avec le couple déterministe
`created_at DESC NULLS LAST, id ASC`. Le curseur encode les deux valeurs : la
branche d'égalité sur `id` évite perte et doublon lorsque plusieurs templates
partagent le même timestamp; les timestamps `NULL` ont une branche dédiée. Un
curseur malformé est refusé avant toute requête avec `INVALID_CURSOR` expurgé.

La recherche nom/tag et les filtres tags conservent leur comportement local.
Lorsqu'ils changent, le contrôleur invalide la pagination courante et épuise les
pages serveur avant d'appliquer le filtre : aucun résultat d'une page non
chargée n'est masqué. Hors filtre, le bouton accessible « Charger plus » charge
une seule page. Un verrou empêche les doubles requêtes; une génération ignore
les réponses d'un coach précédent ou reçues après démontage. Les IDs déjà vus
sont dédupliqués défensivement.

Une panne initiale remplace le chargement par un retry. Une panne incrémentale
conserve les templates déjà visibles et propose un retry de la même page.

## Mesures

L'ouverture de la section Programmes conserve deux requêtes initiales : une page
de templates et le catalogue d'exercices. Les templates lus passent de 50 à 20
maximum; avec le catalogue historique de 200 exercices, les lignes initiales
maximales passent de 250 à 220. Les requêtes initiales du dashboard coach
restent inchangées car cette section est chargée à la demande.

## Limites

Les insertions concurrentes antérieures au curseur apparaissent seulement après
un rafraîchissement, propriété normale d'un parcours par curseur. Les paiements
restent limités à 200 pour les agrégats et les clients à 100 pour l'annuaire
transversal; lever ces bornes exige des read models globaux distincts, pas une
pagination visuelle partielle.
