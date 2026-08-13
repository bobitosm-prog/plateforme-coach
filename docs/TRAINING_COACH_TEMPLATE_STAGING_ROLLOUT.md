# Rollout staging du serving canonique des templates coach

## Statut et périmètre

Ce document est un contrat de préparation. Il n'active aucun runtime.
`listCoachProgramPage` reste en `legacy-only` tant qu'un sous-batch ultérieur
n'a pas satisfait tous les critères GO ci-dessous et branché explicitement le
contrôle `createCoachTemplateCanonicalServingValidationControl`.

Le périmètre est exclusivement la page paginée des templates coach. Sont hors
périmètre `useCoachProgramPagination`, l'UI, `listCoachPrograms`,
`findProgramByIdForOwner`, `client_programs`, `custom_programs`, les sessions,
la base, les migrations et la CI.

## Contrat d'activation staging

L'activation future doit être fail-closed et exiger simultanément quatre
preuves fournies à un résolveur pur de configuration :

1. autorité applicative exactement `staging` ;
2. environnement de déploiement exactement `preview`, jamais `production` ;
3. branche déployée exactement `phase-6-staging` ;
4. demande explicite exactement `canonical-when-identical`.

Toute valeur absente, inconnue, contradictoire ou égale à `production` doit
résoudre vers l'absence de contrôle, donc `legacy-only`. Aucun nom d'hôte,
cookie, payload programme, identité utilisateur ou heuristique UI ne peut
servir de preuve d'environnement.

Le futur sous-batch d'activation devra fournir ces quatre entrées depuis la
composition de déploiement, sans modifier le hook ou l'UI et sans ajouter de
lecture Supabase. Il devra appeler l'unique constructeur contrôlé existant ; il
ne devra pas créer une seconde voie permettant de passer directement une
chaîne de mode au repository.

La configuration Production doit omettre la demande explicite. Une garde dure
doit en plus refuser `canonical-when-identical` dès qu'une entrée indique
`production`, même si les trois autres entrées sont mal configurées comme
staging.

## Invariants de serving

Même après activation staging, chaque ligne reste soumise au contrat actuel :

- `MATCH` et projection UI strictement identique : représentation canonique
  autorisée ;
- `WARNING`, `CRITICAL_MISMATCH`, `UNSUPPORTED`, erreur d'adaptation ou
  différence de projection UI : ligne legacy originale retournée par identité ;
- ordre, `hasMore` et `nextCursor` inchangés ;
- une seule requête Supabase, avec projection, filtres, tris et limite
  inchangés ;
- aucune mutation de la page ou de la ligne legacy.

Une activation globale du mode n'autorise donc jamais une ligne individuelle
à contourner les conditions `MATCH` et identité UI.

## Observabilité obligatoire avant activation

Les métriques shadow actuelles indiquent le format, le résultat, les codes de
différence, les compteurs de warnings et champs non mappés, la durée et une
corrélation opaque. Un événement local séparé observe désormais la décision de
serving avec exactement :

- `serving_mode` : `legacy-only` ou `canonical-when-identical` ;
- `served_source` : `canonical` ou `legacy-fallback` ;
- `fallback_reason` parmi les raisons déjà typées, `null` si canonique.

Sont interdits : identifiants coach/template, nom, description, tags, jours,
exercices, payload JSON, email, cookie, JWT, token ou header d'autorisation.
L'observateur est fail-safe et n'ajoute ni requête distante ni effet sur la
réponse legacy. Une page vide, une erreur de lecture et les autres readers
Training n'émettent aucun événement de décision.

## Baseline avant activation

La baseline staging doit couvrir au minimum trois parcours paginés complets et
50 lignes observées au total. Si staging contient moins de 50 templates, trois
parcours complets de toutes les lignes sont requis et la taille réduite doit
être signalée dans la décision.

La capture doit établir :

- nombre total de lignes et de pages ;
- distribution `MATCH`, `WARNING`, `CRITICAL_MISMATCH`, `UNSUPPORTED` ;
- distribution des codes de warning/différence ;
- nombre de projections UI identiques parmi les `MATCH` ;
- stabilité de l'ordre, `hasMore` et `nextCursor` ;
- zéro erreur Supabase supplémentaire et une seule lecture par page.

Les templates comportant `split` ou `duration` sont actuellement susceptibles
de rester en `WARNING` car ces champs affichés ne sont pas canoniques. Ils ne
doivent pas être comptés comme lignes canoniques éligibles.

## Critères GO

Le GO exige toutes les conditions suivantes :

- cible staging et branche prouvées par les quatre verrous ;
- tests contrat/repository, TypeScript, ESLint et contrôles statiques verts ;
- observabilité de décision de serving disponible et expurgée ;
- au moins une ligne `MATCH` avec projection UI identique sur chaque parcours ;
- zéro `CRITICAL_MISMATCH` ;
- zéro erreur d'adaptation ou d'observateur ;
- zéro différence de projection UI parmi les lignes proposées au canonique ;
- zéro `UNSUPPORTED` ;
- taux de `WARNING` inférieur ou égal à 5 %, composé uniquement de codes connus
  et documentés ;
- aucune différence de nombre, ordre, pagination ou champs affichés.

Une exception aux seuils ne peut pas être décidée implicitement par le code.
Elle exige un nouveau sous-batch de contrat ; le présent plan ne l'autorise pas.

## Seuils NO-GO et arrêt immédiat

Avant activation, un seul des événements suivants impose `NO-GO` :

- cible ou branche non prouvée, entrée contradictoire ou mention Production ;
- absence de métrique `served_source`/`fallback_reason` ;
- au moins un `CRITICAL_MISMATCH`, une erreur d'adaptation ou une différence UI ;
- `UNSUPPORTED` non inventorié ;
- taux de `WARNING` supérieur à 5 % ou code nouveau ;
- aucune ligne canonique éligible ;
- dérive de pagination, requête supplémentaire ou mutation de ligne.

Après activation, le premier `CRITICAL_MISMATCH`, `UNSUPPORTED` nouveau,
erreur d'adaptation, erreur d'observateur, `PRESENTATION_MISMATCH`, résultat
canonique sans `MATCH`, différence UI, requête supplémentaire ou dérive de
pagination déclenche l'arrêt immédiat. Un taux de `WARNING` supérieur à la
baseline de plus d'un point de pourcentage, ou supérieur à 5 %, déclenche aussi
l'arrêt.

## Fenêtre d'observation après activation

La validation post-activation exige trois parcours paginés complets et au
moins 30 minutes d'observation staging. Pendant cette fenêtre :

- les lignes éligibles doivent produire `served_source=canonical` ;
- toutes les autres doivent produire `served_source=legacy-fallback` avec la
  raison attendue ;
- les pages et cartes doivent conserver leur nombre, ordre et champs affichés ;
- les actions de liste ne doivent recevoir aucune forme différente ;
- aucune donnée Production ne doit être consultée.

Le succès local ou synthétique seul ne constitue pas un GO staging.

## Rollback

Le rollback ne touche ni la base ni les données. Il consiste à supprimer la
demande explicite `canonical-when-identical` du scope staging, puis redéployer
le même SHA. L'absence de contrôle ramène immédiatement le repository à
`legacy-only` par son défaut actuel.

Après rollback, vérifier sur un parcours paginé complet :

- `serving_mode=legacy-only` ;
- toutes les lignes retournées par identité legacy ;
- ordre, `hasMore` et `nextCursor` inchangés ;
- une seule requête Supabase ;
- aucun événement `served_source=canonical`.

Le rollback est déclaré incomplet tant que ces preuves ne sont pas capturées.
Il ne nécessite aucun revert de migration, backfill ou restauration de donnée.

## Sous-batch d'activation ultérieur

Le prochain sous-batch, séparé du présent contrat, devra uniquement :

1. ajouter le résolveur pur des quatre verrous ;
2. brancher le contrôle dans la composition staging sans toucher hook/UI ;
3. prouver le refus Production et le défaut `legacy-only` ;
4. exécuter la baseline, décider GO/NO-GO, puis seulement activer staging sous
   autorisation explicite.

Le présent document n'autorise ni ce branchement ni un déploiement.
