# Sections de ProgressTab

> Statut : architecture de présentation de Phase 4. Cette extraction ne change
> ni les calculs d'`AnalyticsSection`, ni les accès Supabase historiques encore
> orchestrés par `ProgressTab`.

## Mesures

| Frontière | Lignes après extraction | Responsabilité |
|---|---:|---|
| `ProgressTab.tsx` | 998 (avant : 1 159) | état, effets, mutations historiques, read model, photos, bien-être, analytics et overlays |
| `ProgressOverviewSection.tsx` | 49 | titre, trois statistiques et navigation des sections |
| `ProgressWeightSection.tsx` | 53 | valeur courante, objectif, delta, mini-graphe, période et action d'ajout |
| `ProgressRecordsSection.tsx` | 40 | limite 10/50/100, records ordonnés et état vide |
| `ProgressMeasurementsSection.tsx` | 30 | quatre mensurations visibles et action d'ajout |
| `types.ts` | 23 | contrats de présentation partagés |

Chaque vue reçoit uniquement des données et callbacks typés. Aucune ne crée un
client, ne lit Supabase, n'importe un repository/read model ou ne réalise une
mutation. Les refs de navigation restent possédées par la façade.

## Contrats préservés

- L'ordre reste synthèse/navigation, poids, records, transformation, mesures,
  bien-être puis graphiques.
- Les textes continuent d'utiliser le namespace `progress` et les libellés
  français historiques `TAILLE`, `POITRINE`, `BRAS`, `CUISSES`.
- Le volume conserve les formats visibles `kg` et `T` avec l'arrondi actuel.
- Le poids conserve le fallback `currentWeight → dernier point → —`, les
  périodes 7/30/90/tout et le SVG existant.
- Records, e1RM, unités, dates, limites et état vide gardent les mêmes valeurs.
- Une mensuration absente affiche `—`; un zéro explicite reste `0` sans unité,
  conformément au comportement caractérisé avant extraction.
- Les callbacks de navigation, période, ouverture des modales et limite des
  records restent coordonnés par `ProgressTab`.

## États et limites

Les tableaux vides et valeurs absentes sont caractérisés dans les vues. Le
contrat public legacy de `ProgressTab` reçoit toutefois uniquement des tableaux
et nombres : il ne transporte pas encore les statuts `partial`, `unavailable`
ou `failure` du [read model](PROGRESSION_READ_MODELS.md). Ces états demeurent
donc indistinguables visuellement sans faire évoluer le contrat consommateur ;
aucun faux état ou nouveau message n'a été inventé dans cette tranche.

Restent directement composés dans la façade :

- transformation photo, analyse corporelle et comparaison avant/après ;
- bien-être et transformations locales des check-ins ;
- `AnalyticsSection`, dont les calculs feront l'objet de la tâche dédiée ;
- overlays de poids, mensurations, photos et comparaison ;
- mutations et effets Supabase historiques.

La réduction sous 500 lignes reste une tâche ultérieure. L'extraction présente
n'a pas déplacé ces responsabilités dans un nouveau composant monolithique.
