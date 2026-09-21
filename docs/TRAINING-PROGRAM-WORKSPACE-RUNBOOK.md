# Gestion simplifiée des programmes — 21 septembre 2026

## Tâche, périmètre et logique

Rendre la gestion quotidienne accessible directement depuis « Mon programme », sans étape « Configurer ». Conserver les fonctions avancées derrière des sections repliables, les protections coach et les droits d'accès existants. Aucun changement de formule d'abonnement ni remplacement automatique mensuel.

- Bibliothèque séparée du programme en cours ; créations/imports enregistrés inactifs.
- Activation immédiate après confirmation explicite, archivage réversible des inactifs.
- Réglages par exercice repliés ; types de séance, tempo et techniques avancées facultatifs.
- Plages de répétitions et durées conservées ; repos édité dans le champ utilisé à l'exécution.
- Changement de repos/fréquence sans effacer les exercices ; reprise d'un brouillon local pendant sept jours, lié au compte et à la version du programme.
- Confirmation avec aperçu avant/après et mise au point clavier sur cet aperçu.
- Réglages des programmes à phases : phase actuelle (ou phase de départ pour un inactif) ou toutes les phases. L'activation annonce le redémarrage à la semaine 1. Les séries hebdomadaires de la semaine courante sont remplacées seulement lorsque l'utilisateur édite explicitement les séries.
- L'alternative d'exercice remplace l'identité du mouvement ; les propositions du catalogue respectent le matériel déclaré.
- L'origine, la description et les phases d'un programme existant ne sont pas écrasées par une modification manuelle.

## Persistance et sécurité

`POST /api/training-program` : authentification vérifiée, quota de requêtes, droit entraînement (indépendant du droit IA), validation du corps, propriétaire issu de la session exclusivement.

`edit_training_program_v1` : transaction, verrou propriétaire et programmes, comparaison de la version complète, identifiant de tentative stable pour les reprises réseau. L'activation refuse un état actif différent de celui confirmé. Les relations coach ambiguës et les programmes fournis par le coach sont protégés ; une relation sans programme attribué ne bloque pas le programme personnel.

La mise à jour du programme et du calendrier est atomique. Seules les séances `custom` non terminées à partir d'aujourd'hui sont remplacées. Les créneaux de la semaine courante sont reconstruits en tenant compte des jours restants, du fuseau Zurich et des préférences horaires ; le remplissage des semaines suivantes reste assuré par le mécanisme existant. Les séances passées, terminées et cardio ne sont pas supprimées.

`training_program_changes` conserve la version précédente. RLS propriétaire en lecture ; aucune écriture ni exécution RPC directe pour `anon` ou `authenticated`. Fonction SECURITY INVOKER, search_path vide, appel réservé au service serveur.

Migration locale générée par CLI : `20260921160900_training_program_atomic_editor.sql`.
Migration nommée appliquée via API Supabase :

- staging : `20260921163936`
- production : `20260921164128`

Les historiques de versions locaux/distants divergeaient déjà. Ne pas lancer un `db push --include-all` : réconcilier l'historique séparément, sans rejouer les anciennes migrations.

## Validations 4/4

1. **Logique** : suite habituelle 1 908 tests / 208 fichiers, TypeScript et build local réussis ; parité 3 282 clés FR/EN/DE.
2. **Persistance réelle** : PostgreSQL/PostgREST jetables, migration appliquée deux fois, 28 tests d'intégration. Couverture des reprises simultanées, conflits, isolation propriétaire, archivage/restauration et protection coach. Panne volontaire du calendrier : rollback intégral vérifié. Sauvegarde synthétique restaurée et comparée.
3. **Interactions** : tests React du vrai éditeur : champ de repos, plage de répétitions, confirmation en deux étapes, reprise locale, jour de repos réversible, refus serveur sans faux succès.
4. **Vérification visuelle** : écran local synthétique dans le navigateur, desktop puis 390 × 844. Contraste et position de l'aperçu corrigés après inspection, puis revérifiés. Exercices récupérés avec leur repos modifié après passage repos/entraînement. Route de démonstration retirée avant commit ; aucune donnée réelle modifiée.

La seconde passe a inclus la suite habituelle, l'intégration SQL et les contrôles d'interface après correction. Le fichier SEO `seo-landing-schema.test.tsx`, exclu de la configuration habituelle avant cette tâche, présente un test historique de structure non vert lorsqu'on élargit temporairement la découverte aux TSX ; ce point marketing reste hors périmètre et n'est pas présenté comme validé.

## Livraison et retour arrière

Déployer la migration additive avant le frontend. Vérifier les contrôles CI, le déploiement READY, l'alias réel `app.moovx.ch`, le refus HTTP sans session et l'accès direct au nouveau gestionnaire. Ne pas enregistrer de programme réel pour un simple smoke test.

En cas de rollback frontend, conserver la colonne et la table de versions : ne pas supprimer l'historique ni réactiver automatiquement un ancien programme. La migration additive est compatible avec l'ancien frontend.

## Limites explicites

- Pas de planification future prétendument automatique : l'ancien choix de date non exécuté est retiré du nouveau parcours ; activation immédiate uniquement.
- Les brouillons restent propres à l'appareil et ne remplacent pas les versions serveur. Un brouillon lié à une ancienne révision n'est pas réappliqué sur une nouvelle version.
- Historique affiché : les 50 dernières opérations du compte, pas une sauvegarde universelle de toutes les anciennes opérations réalisées avant cette livraison.
- Le blocage de séance en cours repose sur le brouillon local existant ; une séance ouverte sur un autre appareil ne peut pas être détectée par cette seule protection.
- Les essais visuels sont des simulations de largeur mobile, pas un test sur iPhone physique. Aucune vraie séance Drop Set/FST-7 n'a été exécutée dans cette tâche.
- Cet ensemble valide le périmètre de gestion des programmes ; ce n'est pas une certification sans défaut de toute l'application.
