# MoovX — Runbook RC1 déploiement et rollback

## 1. Portée et garde-fous

- Branche source : `phase-6-staging`.
- Phase 9 active depuis la validation explicite de RC1 le 30 juillet 2026.
- Production interdite sans autorisation explicite séparée.
- Ne jamais réutiliser les variables de production pendant une validation
  staging ou Preview.
- Lorsque ces preuves sont disponibles, vérifier
  `productionProjectExcluded=true` et `productionVariablesLoaded=false`.
- Ne jamais exécuter `npm audit fix --force` pendant le déploiement.
- Ne jamais modifier les dépendances pendant l’opération RC1.
- N’exécuter aucun changement de schéma ou de données sans plan et
  autorisation dédiés.

Tout écart à ces garde-fous impose l'arrêt immédiat de l'opération.

La procédure de décision de release actuelle est définie dans
[`RELEASE_PROCEDURE.md`](RELEASE_PROCEDURE.md). Le présent document conserve
les opérations Preview et l'interface rollback; il ne démontre ni une CI
stable ni un rollback applicatif en moins de 30 minutes.

## 2. Prérequis opérateur

- [ ] Accès GitHub au dépôt et à la branche autorisée.
- [ ] Accès Vercel au projet et au scope Preview autorisés.
- [ ] Accès au projet Supabase staging autorisé.
- [ ] Accès au compte Stripe test si les flux Stripe sont vérifiés.
- [ ] Accès Mailpit ou SMTP staging si les notifications sont vérifiées.
- [ ] Secrets staging séparés des secrets de production.
- [ ] Branche locale propre.
- [ ] Versions Node.js et npm compatibles avec le dépôt.
- [ ] Outils Supabase disponibles.
- [ ] Fenêtre opérateur, responsabilités et canal d’incident définis.

## 3. Vérifications avant déploiement

Exécuter localement :

```bash
git status --short
git branch --show-current
git fetch origin
git rev-parse HEAD
git rev-parse origin/phase-6-staging
git diff --check
npm ls --depth=0
npm run supabase:types:check
npm run supabase:factories:check
npm run i18n:check
npm run perf:budget:check
```

Ne continuer que si :

- [ ] La branche courante est exactement `phase-6-staging`.
- [ ] `HEAD` et `origin/phase-6-staging` désignent le même SHA.
- [ ] `git status --short` ne retourne aucun changement.
- [ ] `git diff --check` ne retourne aucune erreur.
- [ ] Aucune variable de production n’est chargée.
- [ ] Les contrôles préalables réussissent.
- [ ] Les vulnérabilités npm déjà documentées restent présentées comme
  ouvertes, et non comme corrigées.

## 4. Validation technique minimale avant promotion

Exécuter les validations dans cet ordre :

```bash
npm test
npx tsc --noEmit
npm run build
npm run test:e2e:critical
```

- [ ] Suite complète verte, avec uniquement les `todo` RC1 documentés.
- [ ] TypeScript vert.
- [ ] Build de production vert.
- [ ] Deux builds hermétiques réalisés si la politique RC1 l’exige pour cette
  promotion.
- [ ] E2E critiques verts sur une pile locale autorisée et propre.
- [ ] Préflight local exécuté depuis une preuve explicite avec
  `npm run release:preflight -- --input <fichier-local>`.

Le préflight local ne remplace pas une CI stable : aucune configuration CI
versionnée n'existe encore dans le dépôt.

Les tests qui utilisent Stripe, Anthropic, Push ou SMTP dépendent
d’environnements explicitement autorisés. Ne jamais les pointer par défaut
vers staging ou production et ne jamais substituer un secret réel à une
fixture locale.

Cette section décrit la procédure; elle ne constitue pas un résultat
d’exécution.

## 5. Vérification Supabase staging

Valider d’abord le contrat local :

```bash
npm run supabase:local:verify
npm run supabase:local:fingerprint
```

- [ ] Inventaire exact de 149 migrations sources.
- [ ] Comparaison contre le plan final de 145 versions staging.
- [ ] Verdict d'alignement exactement `ALIGNED`.
- [ ] Projet staging explicitement identifié avant toute lecture distante.
- [ ] Aucune migration production.
- [ ] Aucune migration staging destructive ni mutation de données sans
  autorisation séparée.

Au 6 août 2026, staging présente 141/145 versions et le verdict documenté
`HISTORY_AND_STRUCTURE_DRIFT`. Cet état impose `NO_GO`; les quatre versions
manquantes ne sont pas remédiées par cette procédure.

Plans d’autorité :

- [Plan de migration staging Phase 6](PHASE_6_STAGING_MIGRATION_PLAN.md)
- [Reversioning des migrations staging](PHASE_6_STAGING_MIGRATION_REVERSIONING.md)
- [Classification des mutations staging](PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md)
- [Seed synthétique staging Phase 6](PHASE_6_STAGING_SYNTHETIC_SEED.md)

## 6. Vérification Vercel Preview

Consigner sans exposer de secret :

- [ ] Le déploiement correspond exactement au SHA candidat.
- [ ] Le statut du déploiement est `READY`.
- [ ] Le domaine Preview exact est relevé dans le journal d’opération.
- [ ] Les variables appartiennent au scope Preview/staging attendu.
- [ ] La protection Vercel éventuelle est connue et testée.
- [ ] Les routes critiques sont accessibles.
- [ ] Aucune route ni redirection ne pointe vers la production.
- [ ] `NEXT_PUBLIC_APP_URL` correspond exactement à la Preview autorisée.

Référence : [Preview Vercel Phase 6](PHASE_6_VERCEL_PREVIEW.md).

## 7. Variables et secrets

Comparer uniquement la présence, l’environnement et le scope. Ne jamais
copier les valeurs dans ce runbook, les logs, les captures ou le journal.

- [ ] `NEXT_PUBLIC_SUPABASE_URL` : staging.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` : staging.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` : staging, serveur uniquement.
- [ ] Clés Stripe : mode test uniquement.
- [ ] `STRIPE_PLATFORM_WEBHOOK_SECRET` : endpoint Platform staging.
- [ ] `STRIPE_CONNECT_WEBHOOK_SECRET` : endpoint Connect staging.
- [ ] Anthropic : configuration staging/test autorisée.
- [ ] SMTP ou Mailpit : staging/local.
- [ ] VAPID/Push : scope staging autorisé.
- [ ] Variables média/CDN : autorités publiques et privées attendues.
- [ ] `NEXT_PUBLIC_APP_URL` : URL exacte de la Preview autorisée.
- [ ] `productionProjectExcluded=true`, si cette preuve est exposée.
- [ ] `productionVariablesLoaded=false`, si cette preuve est exposée.

## 8. Déploiement

Cette section décrit une opération Preview. La décision de release et ses
gates sont régies par [`RELEASE_PROCEDURE.md`](RELEASE_PROCEDURE.md); aucune
commande Production n'est autorisée implicitement.

1. Geler et consigner le SHA candidat.
2. Vérifier que `phase-6-staging` est propre et synchronisée avec
   `origin/phase-6-staging`.
3. Déclencher, ou identifier, le déploiement Vercel Preview correspondant par
   le mécanisme autorisé du projet.
4. Attendre et vérifier l’état `READY`.
5. Vérifier les variables staging par présence, environnement et scope.
6. Vérifier la connexion au projet Supabase staging autorisé.
7. Exécuter les smoke tests autorisés de la section suivante.
8. Enregistrer le SHA, l’URL Preview, la date, l’opérateur et tous les
   résultats.
9. Ne promouvoir vers production qu’après une autorisation RC1 explicite et
   séparée.

Aucune commande de promotion production n’est prescrite ici : utiliser
uniquement une procédure explicitement documentée et autorisée pour le projet.

## 9. Smoke tests après déploiement

### Validations automatisées

- [ ] Landing.
- [ ] Login.
- [ ] Inscription.
- [ ] Invitation coach.
- [ ] Dashboard client.
- [ ] Dashboard coach.
- [ ] Training.
- [ ] Nutrition.
- [ ] Progression.
- [ ] Messagerie.
- [ ] Médias publics via le CDN `media.moovx.ch`.
- [ ] Médias privés via URL signée.
- [ ] IA avec quota.
- [ ] Stripe en mode test.
- [ ] SMTP/Mailpit.
- [ ] Push, si l’environnement est disponible.

### Validations humaines encore nécessaires

- [ ] Parcours critiques desktop.
- [ ] Parcours critiques mobile.
- [ ] Responsive et absence de régression visuelle.
- [ ] Messages d’erreur et états vides.
- [ ] Accessibilité des interactions critiques.

## 10. Critères d’arrêt immédiat

Arrêter sans poursuivre ni tenter de correction improvisée si :

- Une variable de production est détectée.
- Le projet Supabase n’est pas le staging autorisé.
- Le SHA déployé diffère du SHA candidat.
- Des migrations inattendues sont détectées.
- Auth présente une erreur critique.
- Les webhooks Stripe sont mal scopés entre Platform et Connect.
- Un média privé devient public.
- Le build ou TypeScript est rouge.
- Une régression critique est observée.
- Les données staging sont incohérentes.
- Une erreur `5xx` persiste sur un parcours critique.

Consigner le constat, arrêter la promotion et décider explicitement si le
rollback application est requis.

## 11. Rollback application

Cette section est une interface d'urgence existante. La tâche Phase 9
« Définir et répéter la procédure de rollback » reste distincte et non
terminée; aucune durée inférieure à 30 minutes n'est encore prouvée.

1. Identifier le dernier SHA Preview validé et documenté comme sain.
2. Ne pas réécrire l’historique Git.
3. Redéployer ce SHA connu comme sain avec la méthode Vercel autorisée.
4. Attendre et vérifier l’état `READY`.
5. Rejouer les smoke tests critiques.
6. Documenter le SHA fautif, le SHA restauré, la cause et les résultats.

Interdictions :

- Ne pas utiliser `git reset --hard` sur une branche partagée.
- Ne pas effectuer de force-push.
- Ne pas modifier simultanément application, base et secrets sans plans
  séparés.

## 12. Rollback base de données

- Ne jamais improviser un rollback SQL.
- Consulter les plans de reversioning existants avant toute action.
- Considérer les migrations comme forward-only par défaut.
- N’autoriser une restauration ou une migration compensatoire qu’après revue.
- Classifier séparément toute mutation de données.
- Obtenir une sauvegarde ou une preuve de restauration exploitable avant
  action.
- Interdire toute opération production sans autorisation séparée.

## 13. Rollback secrets et intégrations

- Restaurer l’ancienne configuration Vercel, Supabase ou Stripe uniquement
  depuis les consoles et procédures autorisées.
- Ne jamais afficher ni recopier les secrets dans le journal.
- Révoquer un secret compromis au lieu de simplement restaurer son ancienne
  valeur.
- Vérifier séparément les scopes Stripe Platform et Connect.
- Vérifier les URL des webhooks.
- Contrôler les configurations SMTP, Push et Anthropic.

## 14. Validation après rollback

- [ ] SHA restauré conforme au dernier candidat sain.
- [ ] Preview `READY`.
- [ ] Auth fonctionnelle.
- [ ] Données cohérentes.
- [ ] Médias privés toujours servis par URL signée.
- [ ] Stripe test et webhooks correctement scopés.
- [ ] Flux IA autorisés.
- [ ] SMTP/Mailpit autorisé.
- [ ] Aucune erreur `5xx` persistante sur les parcours critiques.
- [ ] Journal opérateur complété.

## 15. Journal d’opération

```text
Date/heure :
Opérateur :
Environnement :
Branche :
SHA candidat :
SHA précédent :
URL Preview :
Projet Supabase :
Validations exécutées :
Résultat :
Incidents :
Rollback (oui/non) :
SHA restauré :
Décision finale :
```

Ne consigner aucune clé, aucun token, aucun cookie ni aucune valeur secrète.

## 16. Limitations

- Ce runbook ne constitue pas une autorisation production.
- La validation humaine desktop/mobile reste ouverte.
- La validation explicite RC1 reste ouverte.
- Les vulnérabilités npm connues restent ouvertes.
- Certains domaines ne disposent pas encore d’un E2E navigateur complet.
- Phase 9 reste inactive.
