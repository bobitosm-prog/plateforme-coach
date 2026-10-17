# Phase 10 — premier programme coach organique en staging

## Vérification du parcours

Un compte coach de staging a créé, depuis l'interface, un programme pilote de
quatre semaines avec deux journées et six exercices. Après sauvegarde et
rechargement, le programme figure toujours dans la liste. L'écran Modifier
retrouve les deux journées et les six exercices. Une lecture de la table
`training_programs` du projet staging confirme une ligne `is_template = true`
avec ces mêmes nombres. Aucune donnée Production n'a été consultée ou modifiée.

Ce parcours ne présente pas d'erreur fonctionnelle de création, sauvegarde ou
relecture. Il constitue le premier corpus organique disponible pour la phase 10.

## Diagnostic de compatibilité canonique

Une évaluation locale en lecture seule de cette ligne organique, avec le
comparateur et le contrat de serving existants, a été répétée trois fois.
Chaque passage donne `WARNING` et `legacy-fallback`, avec conservation de la
ligne legacy par identité. Il n'y a ni mismatch critique ni erreur d'adaptation
sur cette ligne.

Le comparateur relève huit avertissements : six références d'exercice
conservées par nom et deux champs racine non mappés (`split`, `duration`). Le
taux de warning observé sur ce corpus d'une ligne est donc de 100 %, sans ligne
`canonical_eligible`. Les seuils du contrat de rollout ne sont pas atteints.

Ces trois évaluations locales ne remplacent **pas** les trois parcours complets
du runner `runCoachTemplateStagingAssessment` avec le repository connecté au
client authentifié de staging. `REAL_CORPUS_VALIDATION_PENDING` reste actif et
l'opt-in canonique reste interdit.

## Autre verrou de phase 10

Le registre CI est toujours `CI_STABILITY_CANDIDATE` : 20 runs complets sur
4 jours UTC, dont 8 réussis et 12 en échec. Le minimum requis est 150 runs sur
7 jours UTC, sans échec non résolu. `STAGING_NOT_READY` reste le statut global.

La prochaine intervention technique est de préserver `split` et `duration` dans
la représentation canonique sans modifier la projection UI, puis de résoudre
les références d'exercice ou d'expliciter leur compatibilité dans le contrat.
Après cette correction, exécuter les trois parcours organiques avec un reader
staging authentifié et réévaluer les seuils. Aucune promotion Production ne
découle de ce contrôle.

## Correctif local ultérieur

L'adaptateur des templates coach conserve désormais `split` et `duration`
dans `templatePresentation`. Pour ce format uniquement, une référence
d'exercice par nom est acceptée comme référence legacy typée lorsque la
projection sémantique et l'affichage restent identiques. Les champs inconnus,
les valeurs ambiguës et les différences d'affichage gardent le fallback.

La même ligne organique, relue sans mutation depuis staging puis évaluée avec
le code corrigé en local, donne `MATCH`, zéro warning, zéro champ non mappé et
une ligne reconstruite profondément égale à la ligne de départ. Les tests
ciblés et la suite complète passent. Cette vérification locale ne remplace
toujours pas les trois parcours du runner avec le reader authentifié après
déploiement du correctif en staging ; le statut reste en attente.

## Validation complémentaire du 17 octobre 2026

Le preview associé à l'alias `moovx-phase-6-staging.vercel.app` a été vérifié
via l'API Vercel : déploiement prêt de `phase-6-staging` au SHA
`a2f37e93a120aba4de78248b4eef18085d851381`, qui contient le correctif
ci-dessus. La cible Supabase est exclusivement le projet staging
`cycbnnojcymjnaqomlyj`.

Un nouveau compte coach de test, confirmé uniquement dans Auth staging, a
terminé l'onboarding sans connexion Stripe. Depuis l'interface coach, il a
créé puis rouvert un template non-fixture de 4 semaines, 2 jours et
2 exercices. Le nom, le split, la durée, les jours et les exercices étaient
conservés à la relecture. Aucun programme n'a été écrit en Production.

Le runner `runCoachTemplateStagingAssessment`, relié au client Supabase
authentifié de ce coach et au repository réel, a ensuite parcouru trois fois
l'intégralité de **son** corpus. Chaque parcours a atteint la page terminale.

| Mesure | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Pages / lignes | 1 / 1 | 1 / 1 | 1 / 1 |
| `canonical_eligible` | 1 | 1 | 1 |
| `warning` | 0 | 0 | 0 |
| `critical_mismatch` / `unsupported` | 0 / 0 | 0 / 0 | 0 / 0 |
| `presentation_mismatch` / `adaptation_error` / `observer_error` | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

Les trois identifiants de run sont distincts. Avec `nonFixtureTemplateCount = 1`
pour ce compte, l'évaluateur du contrat retourne `REAL_CORPUS_VALIDATED`,
`nextAction = NONE` et
`PRODUCTION_PROMOTION_NOT_AUTHORIZED_BY_THIS_CONTRACT`, sans raison de refus.
Cette preuve couvre ce nouveau compte coach et son template créé dans l'UI ;
elle ne prétend pas évaluer le template pilote appartenant à l'autre coach.
Le serving demeure `legacy-only` ; aucune activation ou promotion Production
n'a été effectuée.

L'inscription publique d'un autre compte coach sur ce preview a échoué côté
Supabase Auth (`/signup`, HTTP 500, `unexpected_failure`) parce que le serveur
SMTP a rejeté l'authentification (`535`). Le manifeste du preview classe SMTP
parmi les intégrations désactivées. Le compte interne confirmé a permis la
validation ci-dessus sans assouplir l'authentification ni modifier la
configuration SMTP. L'interface d'inscription affiche actuellement `{}` pour
cette erreur et mérite un correctif de message dans un sous-batch distinct.
