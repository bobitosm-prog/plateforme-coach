# Catalogue : variantes et droits — 23 septembre 2026

## Audit terrain

La production contenait 176 lignes historiques, dont 12 alias masqués. Aucun exercice partagé personnalisé ni créé par un client. Les écritures de l’interface visent `custom_exercises` (privé) et les programmes, pas `exercises_db`. Le seul endpoint d’entretien du catalogue trouvé exige une session administrateur ; les scripts d’entretien utilisent le serveur. La fonction SQL de suppression de compte anonymise uniquement le créateur après contrôle d’identité et reste compatible.

La politique « coaches can insert » autorisait tout compte connecté ; les rôles navigateur disposaient de droits d’écriture, y compris TRUNCATE, sur la table et la vue. La RLS ne protège pas une opération TRUNCATE : les privilèges sont donc retirés, en plus des politiques restrictives INSERT/UPDATE/DELETE.

## Frontière d’autorisation

| Acteur | Lecture du catalogue | Modification du catalogue partagé | Exercices privés/programmes |
|---|---|---|---|
| Anonyme | Conservée selon RLS existante | Interdite | Inchangés |
| Client connecté | Conservée | Interdite, même via la vue | Inchangés |
| Coach connecté | Conservée | Interdite depuis le navigateur | Création privée et programmes conservés |
| Serveur autorisé | Conservée | Conservée | Inchangés |

Aucune nouvelle route d’écriture ni fonction SECURITY DEFINER. La vue reste security_invoker. Le traitement administrateur utilise une limite par identité, exclut les fiches en revue et ne signale plus une mise à jour réussie si la base refuse l’écriture.

## Variantes

Corrections de familles : adduction séparée de l’abduction ; reverse pec deck dans la famille oiseau, pas écartés pectoraux ; jambes tendues séparé du roumain ; rameur cardio séparé du rowing de musculation.

La roue abdominale et les battle ropes ont des catégories distinctes, ne sont pas proposées comme de simples élastiques à domicile, et démarrent avec une résistance non quantifiée : séries suivies sans tonnage ni record en kg artificiel.

Douze noms restent insuffisamment définis : Développé Militaire, Développé Militaire Barre, Face Pulls, Rowing Barre, Rowing Haltère, Extension Triceps Poulie, Triceps Poulie Corde, Oiseau / Reverse Fly, Soulevé de Terre Roumain, Glute Bridge, Russian Twist, Torsion Russe Lestée.

Ils sont exclus des nouvelles sélections et refusés dans une génération IA sous ces noms. Les identifiants, anciennes séances, programmes, noms et médias ne sont ni supprimés ni fusionnés. Il s’agit d’une mise en revue, PAS d’une affirmation que ces exercices sont équivalents à une autre fiche.

Le remplacement par mots communs du nom est supprimé dans les trois éditeurs. Les alternatives du suivi doivent appartenir à une même famille explicitement identifiée et rester compatibles avec le matériel.

## Ce qui exige encore une décision de curation

Pour réactiver une fiche ambiguë, préciser matériel, position, prise, amplitude et latéralité ; vérifier sa vidéo ; créer au besoin plusieurs variantes distinctes. Les programmes historiques ne doivent jamais être réétiquetés automatiquement. En particulier, le roumain barre/haltères et les variantes de rotation avec disque/haltère/ballon doivent disposer de prescriptions distinctes avant réintroduction. Aucun matériel n’est déduit d’une vidéo non inspectée.

## Validations

- PostgreSQL local jetable : chaque migration exécutée deux fois ; accès de lecture préservé ; écritures table/vue refusées ; maintenance serveur fonctionnelle ; défense RLS maintenue même après réattribution de privilèges et politique permissive accidentelle.
- Toutes les lignes et identifiants conservés ; fiches ambiguës exclues de la vue ; variantes explicites toujours sélectionnables ; catégories et familles corrigées.
- Tests runtime du endpoint : 401 anonyme, 403 client, 429 administrateur limité par identité avant tout accès privilégié.
- Tests IA : réponse ambiguë refusée même en salle et même sans référentiel chargé.
- Suite locale : 1 967 tests unitaires, 30 tests d’intégration, contrôles SQL de sécurité, TypeScript, i18n (3 langues) et build production réussis.
- Préproduction : deux migrations appliquées ; 176 lignes conservées, 153 sélectionnables, 12 en revue ; lecture conservée et écritures navigateur interdites. Aucun avis de sécurité relatif aux tables concernées remonté par le contrôle.
- La CI et la livraison production restent à confirmer au moment de ce rapport ; le compte rendu de livraison précisera leur résultat.
