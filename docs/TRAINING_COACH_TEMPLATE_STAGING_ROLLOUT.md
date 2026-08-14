# Rollout staging du serving canonique des templates coach

## Statut et périmètre

Ce document est le contrat du mécanisme d'activation staging. Le code reste
inactif tant que l'opt-in staging dédié n'est pas fourni : en configuration
committée, `listCoachProgramPage` reste donc en `legacy-only`. Aucune variable
Vercel ou Supabase distante n'est modifiée par ce sous-batch.

Le périmètre est exclusivement la page paginée des templates coach. Sont hors
périmètre `useCoachProgramPagination`, l'UI, `listCoachPrograms`,
`findProgramByIdForOwner`, `client_programs`, `custom_programs`, les sessions,
la base, les migrations et la CI.

## Contrat d'activation staging

L'activation est fail-closed et exige simultanément six preuves :

1. autorité applicative exactement `staging` ;
2. environnement de déploiement exactement `preview`, jamais `production` ;
3. branche déployée exactement `phase-6-staging` ;
4. project ref Supabase extrait d'une URL HTTPS et exactement égal au projet
   staging attendu ;
5. attestation source-controlled `TECHNICAL_STAGING_GO` valide, avec cleanup,
   baseline et seuil de warning conformes ;
6. opt-in staging dédié exactement `canonical-when-identical`.

Toute valeur absente, inconnue, contradictoire ou égale à `production` doit
résoudre vers l'absence de contrôle, donc `legacy-only`. Aucun nom d'hôte,
cookie, payload programme, identité utilisateur ou heuristique UI ne peut
servir de preuve d'environnement.

Le résolveur lit seulement les cinq entrées publiques littérales suivantes au
moment de la construction du repository :

- `NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY=staging` ;
- `NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT=preview` ;
- `NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH=phase-6-staging` ;
- `NEXT_PUBLIC_SUPABASE_URL`, dont le host doit porter le project ref staging ;
- `NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN=canonical-when-identical`.

Il associe ces entrées à l'attestation technique source-controlled et appelle
l'unique constructeur contrôlé existant. Il ne fournit aucune seconde voie de
serving, ne modifie ni hook ni UI et n'ajoute aucune lecture Supabase.

La configuration Production doit omettre l'opt-in explicite. Une garde dure
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

Le mode interne `assessment-only` exécute exactement cette évaluation
`canonical-when-identical`, mais écarte toujours la page évaluée et retourne la
page legacy et toutes ses lignes par identité. Il n'est construit que par
`createCoachTemplateAssessmentControl` et n'est branché par aucun hook, UI,
flag d'environnement ou configuration distante.

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

En `assessment-only`, un événement agrégé par page contient exclusivement un
identifiant de run opaque généré dans le contrôle, la séquence de page, le
nombre de lignes, le marqueur de page terminale, les six compteurs de décision
et le compteur d'erreur observateur. Il ne contient ni curseur, timestamp
métier, identifiant, nom ou payload. Le même contrôle conserve son run opaque
et incrémente la séquence entre les pages d'un parcours.

Le runner interne `runCoachTemplateStagingAssessment` orchestre un parcours
complet sans ouvrir une seconde voie de lecture. Il exige explicitement
`staging`, `preview`, la branche `phase-6-staging` et la demande
`assessment-only` avant même de construire le reader. Il crée un contrôle
`assessment-only` unique, appelle exclusivement `listCoachProgramPage`, puis
suit son `nextCursor` en mémoire jusqu'à la page terminale. Le curseur n'est
jamais copié dans un événement, un bilan ou une erreur.

Le bilan final contient seulement le run opaque, les nombres de pages et de
lignes, les sept compteurs cumulés, le taux `warning / lignes` (zéro pour un
parcours vide) et la confirmation de page terminale. Une erreur de création du
reader, de lecture, de séquence, d'événement ou de pagination arrête le parcours
avec une raison fermée et sans bilan partiel. Une boucle de curseur et un
plafond défensif de 1 000 pages sont également fail-closed. Le runner ne logue
rien et n'expose ni identité métier, ligne, payload, nom, curseur ou erreur
Supabase brute.

Le caller staging fournit le reader existant déjà lié à son client authentifié.
Le runner ne construit aucun client Supabase, n'ajoute aucune requête et ne
connaît aucune configuration Production. Chaque itération correspond donc
strictement à la lecture paginée normale d'une page. La représentation
canonique évaluée est toujours écartée par le mode `assessment-only` ; le
repository continue de retourner les lignes legacy par identité.

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

## GO technique staging et validation réelle pending

Le statut `TECHNICAL_STAGING_GO` reconnaît uniquement que la mécanique du
rollout fonctionne en staging. Il est distinct d'un GO fondé sur un corpus
organique. Le corpus déterministe de 17 fixtures a produit trois parcours
complets, 51 observations, 17 lignes canoniques éligibles par parcours, zéro
warning, mismatch, résultat unsupported ou erreur, puis une preuve de cleanup
`0 → 17 → 0`. Cette preuve satisfait le GO technique.

L'évaluateur pur exige exactement : cible `staging`/`preview`, branche
`phase-6-staging`, project ref staging, trois run IDs opaques distincts, pages
terminales, au moins 50 observations ou la totalité d'un corpus répétée trois
fois, au moins une ligne `canonical_eligible` par parcours, zéro
`CRITICAL_MISMATCH`, `UNSUPPORTED`, `PRESENTATION_MISMATCH`, erreur
d'adaptation ou d'observateur, et un taux global de warning inférieur ou égal
à 5 %. Pour le corpus déterministe, la preuve de cleanup doit être exactement
`0 → 17 → 0`.

Un `TECHNICAL_STAGING_GO` porte toujours simultanément le statut
`REAL_CORPUS_VALIDATION_PENDING` et `PRODUCTION_PROMOTION_FORBIDDEN`. Il ne
remplace pas la règle selon laquelle un succès synthétique seul ne constitue
pas un GO réel. Il permet seulement l'activation bornée en staging lorsque tous
les autres verrous sont présents et ne peut jamais être interprété comme une
autorisation de promotion Production.

Dès qu'un compteur read-only détecte au moins un template organique non-fixture
en staging, le prochain état requis est `RUN_READ_ONLY_ASSESSMENT`. Trois
parcours complets doivent alors être exécutés avec les mêmes bilans expurgés et
les mêmes seuils. Aucun UUID, email, nom, payload ou lien utilisateur n'est
nécessaire dans la télémétrie. Une absence de corpus, une absence de bilan ou
un bilan en échec conserve `REAL_CORPUS_VALIDATION_PENDING`.

Seul un assessment organique réussi peut produire `REAL_CORPUS_VALIDATED`.
Même ce statut ne promeut rien : il retourne
`PRODUCTION_PROMOTION_NOT_AUTHORIZED_BY_THIS_CONTRACT`, car une autorisation
Production exige un contrat de release distinct.

## Critères GO

Le GO exige toutes les conditions suivantes :

- cible staging et branche prouvées par les six verrous ;
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

Le succès local ou synthétique constitue uniquement le GO technique staging ;
il ne lève ni `REAL_CORPUS_VALIDATION_PENDING` ni l'interdiction Production.

## Rollback

Le rollback ne touche ni la base ni les données. Il consiste à supprimer
`NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN` du scope staging, puis redéployer
le même SHA. L'absence d'opt-in produit l'absence de contrôle et ramène
immédiatement le repository à `legacy-only` par son défaut actuel.

Après rollback, vérifier sur un parcours paginé complet :

- `serving_mode=legacy-only` ;
- toutes les lignes retournées par identité legacy ;
- ordre, `hasMore` et `nextCursor` inchangés ;
- une seule requête Supabase ;
- aucun événement `served_source=canonical`.

Le rollback est déclaré incomplet tant que ces preuves ne sont pas capturées.
Il ne nécessite aucun revert de migration, backfill ou restauration de donnée.

## État du sous-batch d'activation

Le mécanisme committé :

1. résout les six verrous sans toucher hook/UI ;
2. ne construit le contrôle `canonical-when-identical` qu'en cible exacte ;
3. refuse Production et conserve le défaut `legacy-only` ;
4. maintient `REAL_CORPUS_VALIDATION_PENDING` et
   `PRODUCTION_PROMOTION_FORBIDDEN` dans les deux issues.

Le présent sous-batch n'autorise aucune modification distante. L'activation
effective requiert un sous-batch opérateur séparé qui ajoute uniquement les
variables publiques bornées au scope Preview/`phase-6-staging`. Leur retrait
est le rollback documenté.

## Réconciliation opérationnelle Phase 9

Le sous-batch opérateur séparé a depuis exécuté le protocole sans modifier le
code, Supabase ou une donnée métier. Les trois verrous d'autorité ont été
configurés uniquement dans le scope Vercel Preview/`phase-6-staging`; le
project ref effectif `cycbnnojcymjnaqomlyj` a été prouvé depuis les bundles
publics servis par l'alias staging, tandis que le ref Production
`njlzossopgknanhkzcbk` est resté absent.

L'opt-in `canonical-when-identical` a ensuite été appliqué seul, le même SHA
`554575c` redéployé en Preview et l'alias staging rattaché au déploiement prêt.
Les conditions exactes résolvent vers le contrôle canonique; les contrats
repository confirment que seules les lignes `MATCH` avec projection UI
identique sont éligibles, et que tous les autres résultats conservent la ligne
legacy par identité après l'unique lecture existante.

Le rollback a retiré uniquement l'opt-in, redéployé le même SHA et rattaché
l'alias au Preview de rollback. L'état distant final est donc explicitement :

- shadow coverage du périmètre planifié : terminé ;
- serving boundary : terminé ;
- assessment, runner et fixture : terminés ;
- technical staging rollout : `STAGING_SERVING_ACTIVATION_TECHNICALLY_VALIDATED` ;
- mode runtime final : `legacy-only` ;
- corpus organique : `REAL_CORPUS_VALIDATION_PENDING` ;
- Production : `PRODUCTION_PROMOTION_FORBIDDEN`, hors scope actuel.

Aucun template organique n'était disponible pour transformer cette validation
technique en preuve réelle. Dès qu'un template non-fixture apparaîtra en
staging, le runner read-only existant devra être rejoué. D'ici là, aucune
activation persistante ni promotion Production n'est autorisée.
