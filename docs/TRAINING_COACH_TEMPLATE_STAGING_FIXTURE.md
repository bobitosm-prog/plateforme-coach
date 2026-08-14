# Contrat de fixture staging — templates coach

## Statut et autorité

Ce contrat prépare une fixture temporaire pour l'assessment de
`listCoachProgramPage`. Il ne contient aucun runner d'écriture et n'autorise
aucune création distante dans ce sous-batch.

Une future application est fail-closed et exige simultanément :

- environnement applicatif exactement `staging` ;
- déploiement exactement `preview` ;
- branche exactement `phase-6-staging` ;
- project ref Supabase exactement celui du staging Phase 6 ;
- project ref Production explicitement refusé.

Le propriétaire est le persona `coach` du manifeste synthétique
`moovx-phase6-staging-auth-v2`, désigné dans les rapports par l'alias
`phase6-v2-coach`. Aucune identité ne doit être créée. Avant application, un
futur opérateur doit vérifier que ce persona existe toujours, possède le rôle
coach et appartient au même manifeste synthétique. Aucun email ne doit entrer
dans la fixture ou ses preuves.

## Corpus prévu

Le corpus contient exactement 17 lignes, jamais davantage. Trois parcours
complets produisent donc 51 observations. Chaque ligne :

- appartient au namespace `coach-template-assessment-v1` ;
- possède un UUID déterministe dans le namespace réservé à cette fixture ;
- porte un nom préfixé `[fixture:coach-template-assessment-v1]` ;
- a `is_template=true`, une description nulle et un seul tag synthétique ;
- contient uniquement `days`, jours d'entraînement ou repos explicites, et des
  exercices synthétiques avec `exercise_id`, `name`, `sets`, `reps`, `rest` ;
- ne référence aucun client, programme personnel, séance, fichier ou donnée
  utilisateur.

Les quatre formes répétées couvrent une plage de répétitions, des répétitions
fixes, `AMRAP`, plusieurs exercices, plusieurs jours, un repos explicite et une
plage de repos. Le contrat exécute l'adaptateur et la projection de serving
actuels sur les 17 lignes : toutes doivent être `MATCH` et UI-identiques. Si une
évolution transforme une ligne en `WARNING`, `UNSUPPORTED`, mismatch critique
ou mismatch de présentation, les tests échouent avant toute application.

## Protocole futur de création

Le futur sous-batch d'application devra rester séparé et explicite :

1. rejouer les gardes staging/preview/branche/project ref ;
2. résoudre le persona coach synthétique autorisé ;
3. compter les lignes avec le propriétaire, les 17 IDs exacts et le préfixe ;
4. exiger un compteur initial égal à zéro ;
5. insérer les 17 lignes dans une transaction ;
6. recompter et exiger exactement 17 avant tout assessment ;
7. exécuter trois parcours `assessment-only`, jamais le serving canonique ;
8. lancer le cleanup dans un bloc `finally` même si l'assessment échoue ;
9. recompter et exiger exactement zéro.

Une création initiale sur un namespace non vide est refusée. Une erreur
transactionnelle avec compteur final zéro est classée `CREATION_ROLLED_BACK`.
Un compteur de 1 à 16 est `CREATION_PARTIAL_CLEANUP_REQUIRED` : aucun assessment
n'est autorisé et le cleanup commence immédiatement. Tout compteur supérieur à
17 ou non entier est hors contrat et impose un arrêt manuel sans élargir les
filtres.

## Cleanup idempotent

Le cleanup ne cible jamais un préfixe seul. Sa sélection est l'intersection :

- table `training_programs` ;
- owner synthétique exact ;
- liste fermée des 17 UUIDs de fixture ;
- préfixe de nom exact comme garde supplémentaire.

Supprimer cette sélection une seconde fois est un no-op valide. Après chaque
tentative, un compteur zéro produit `CLEANUP_COMPLETE`. Un compteur entre 1 et
17 produit `CLEANUP_PARTIAL_RETRY_REQUIRED` : le rollout reste bloqué, la même
suppression exacte peut être rejouée, et aucun filtre plus large n'est permis.
Le cleanup n'efface jamais le persona coach synthétique.

Si le process est interrompu ou si le résultat réseau est ambigu, l'opérateur
ne suppose ni succès de création ni succès de suppression : il recommence par
le compteur exact. Une preuve finale non nulle interdit tout GO et exige une
escalade jusqu'au retour à zéro.

## Non-impact

La fixture est indépendante de `client_programs`, `custom_programs`, des
sessions, du dashboard et des autres domaines. Elle ne requiert ni migration,
ni changement RLS, UI, hook, CI ou runtime. Elle ne copie aucune ligne ou
donnée Production. `legacy-only` reste le comportement utilisateur par défaut
et l'assessment continue de retourner les lignes legacy.
