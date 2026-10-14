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
