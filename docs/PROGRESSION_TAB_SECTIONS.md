# Sections de ProgressTab

> Statut : architecture de présentation de Phase 4. Cette extraction ne change
> ni les calculs d'`AnalyticsSection`, ni les accès Supabase historiques encore
> orchestrés par `ProgressTab`.

## Mesures

| Frontière | Lignes après extraction | Responsabilité |
|---|---:|---|
| `ProgressTab.tsx` | 72 (avant cette tranche : 998) | façade, refs de navigation et composition des frontières |
| `ProgressOverviewSection.tsx` | 49 | titre, trois statistiques et navigation des sections |
| `ProgressWeightSection.tsx` | 53 | valeur courante, objectif, delta, mini-graphe, période et action d'ajout |
| `ProgressRecordsSection.tsx` | 40 | limite 10/50/100, records ordonnés et état vide |
| `ProgressMeasurementsSection.tsx` | 30 | quatre mensurations visibles et action d'ajout |
| `types.ts` | 23 | contrats de présentation partagés |
| `ProgressPhotosSection.tsx` | 32 | transformation avant/après et actions photo |
| `ProgressBodyAnalysisSection.tsx` | 30 | états vide/chargement/résultat et overlay d'analyse corporelle |
| `ProgressWellnessSection.tsx` | 42 | graphiques et statistiques locales des check-ins |
| `ProgressEntryOverlays.tsx` | 20 | saisies poids et mensurations |
| `ProgressPhotoCompareOverlay.tsx` | 24 | comparaison, sélection, curseur et alignement visuel |
| `ProgressExportButton.tsx` | 8 | action d'export conditionnelle |
| `useProgressTabController.ts` | 85 | état, effets, mutations historiques, export et transformations de coordination |
| `progress-tab-types.ts` | 42 | contrat public legacy et types des nouvelles frontières |

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

La façade ne compose plus directement ces responsabilités. Le contrôleur garde
volontairement les accès Supabase et effets historiques : les vues ne reçoivent
que des données et callbacks typés. L'ordre visible reste synthèse, poids,
records, photos, analyse corporelle, mensurations, bien-être, graphiques et
export.

Restent comme dettes explicites :

- les lectures et mutations Supabase historiques du contrôleur n'ont pas été
  migrées vers des repositories ;
- `body_analyses` et `daily_checkins` conservent leurs deux `select('*')`
  historiques ; aucun accès supplémentaire n'a été introduit ;
- les overlays et photos conservent les balises `img` historiques, donc quatre
  avertissements ESLint `no-img-element` ;
- le contrat public legacy ne distingue toujours pas `partial`, `unavailable`
  et `failure` ;
- les calculs d'`AnalyticsSection` restent dans leurs frontières dédiées et ne
  sont pas dupliqués dans la façade.

La garde statique impose désormais moins de 500 lignes à `ProgressTab` et à
chacune des nouvelles frontières. Aucun nouveau fichier ne concentre à lui seul
le contenu extrait.
