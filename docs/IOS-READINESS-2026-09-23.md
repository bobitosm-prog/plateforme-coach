# MoovX — préparation iPhone : audit initial et plan de livraison

Date : 23 septembre 2026. État : AUDIT INITIAL, pas une certification ni une
autorisation de mise en production iOS.

## 1. Références vérifiées

- Production/main : `3cc03ea83f57b11376663ce37a7cd7a155b391b7`.
- Phase 9/10, staging : `3000c57494432ef390adde896de2536aeb46667f`.
- Après actualisation Git : 281 commits propres à main, 416 propres à staging.
- La différence depuis l'ancêtre commun vers staging couvre 1 355 fichiers.
  Ce chiffre ne représente PAS un nombre de tâches à réintégrer.
- Les preuves de tests sont attachées à leur version et environnement : aucune
  preuve staging ne certifie automatiquement main.

Décision de travail : partir de main pour le candidat iOS ; ne pas fusionner
staging en bloc. Une réconciliation exhaustive fichier par fichier reste à faire.

## 2. Réconciliation fonctionnelle des phases 9/10

| Sujet | Preuve staging | Présent sur main | Décision avant lancement |
|---|---|---|---|
| Tests automatiques | Gates A/B/C1/C2 et 15 parcours critiques documentés | Workflow nutrition-quality : tests, TS, traductions, intégration locale et build | Conserver ; établir une matrice E2E de la version courante, pas copier les compteurs historiques |
| Migrations | Reconstruction complète et alignement staging historiques | Tests jetables ciblés dans check-nutrition-persistence.mjs | Ne pas confondre tests ciblés et reconstruction complète ; requalifier les migrations et sauvegardes du candidat |
| Retour arrière | Répétition Preview historique documentée | Déploiements immuables utilisés, absence de nouvelle répétition démontrée ici | Adapter le runbook et répéter en Preview ; rollback DB séparé |
| Architecture Training | Nouvelle implémentation contrôlée et fallback legacy | Corrections et modèle de séance propres à main | Ne pas activer l'ancienne migration pour fabriquer une app iOS |
| Stabilité statistique | Seuil 150 runs/7 jours, statut candidat documenté | CI différente | Audit des dernières observations requis ; aucun statut CI_STABLE revendiqué |
| Corpus organique | Attente de programmes coach réels en staging | Non inspecté pendant cet audit | Reste un verrou de cette migration, pas une exigence Apple universelle |
| Documentation | Guides de contribution, release et domaines | Roadmap historique partiellement obsolète | Rapporter les invariants utiles au candidat actuel, préserver l'historique |

## 3. Bloqueurs constatés et points non vérifiés

### P0 — checkout web : frontière de confiance absente dans la route

`app/api/stripe/checkout/route.ts` lit `clientId` et `coachId` dans le corps,
valide le format du premier, puis utilise un client privilégié et crée une
session Stripe. Pas de vérification utilisateur ni limite de débit dans cette
route. `proxy.ts` laisse passer les chemins `/api/` avant son contrôle de session.
Le fichier examiné correspond exactement à main.

Constat statique confirmé ; aucune requête de paiement ni exploitation réalisée.
Un contrôle d'infrastructure supplémentaire n'a pas été démontré ici et ne
remplacerait pas l'autorisation métier de la route.

Correctif attendu : identifier l'utilisateur côté serveur, imposer sa propriété
du checkout, contrôler toute attribution coach, limiter les appels avant Stripe,
tester 401/403/429 et le parcours légitime avec fournisseur simulé. Examiner
aussi le webhook et les autres routes de facturation avant de certifier Billing.
La clé d'idempotence actuelle inclut Date.now() : elle ne protège pas deux
requêtes successives identiques comme une clé persistante de tentative.

### P0 — contrat mobile non construit

Pas de projet iOS/Xcode, Capacitor ou StoreKit trouvé dans le dépôt examiné.
Le manifeste PWA et les notifications web existent ; ils ne constituent pas
un binaire iOS. Xcode sélectionné : CommandLineTools ; aucune application
Xcode trouvée à `/Applications/Xcode.app`. Une installation ailleurs n'est pas
exclue. Statut du compte Developer/App Store Connect à confirmer avec Marco.
Marco indique disposer d'un compte pour les bêtas iPhone : cela ne démontre
pas une adhésion active au Developer Program donnant accès à la distribution.
Vérifier l'adhésion sans demander de mot de passe ni engager d'achat.

### P0 — abonnements iOS

Le produit possède un paiement Stripe web. La stratégie de vente iOS, les achats
Apple, leur restauration et la synchronisation des droits ne sont pas démontrés.
L'ancienne phrase de ROADMAP.md assimilant automatiquement login-only,
multiplateforme et reader-app ne doit pas servir de décision de conformité.
Décision commerciale et qualification par territoire nécessaires avant paywall.

### P0 — confidentialité IA à justifier

`content/legal/privacy-fr.md`, section Athena, associe non-entraînement et
« zero data retention ». Ces garanties sont distinctes. La documentation
fournisseur indique une conservation API standard jusqu'à 30 jours, sauf
accords et exceptions. Aucun contrat ZDR propre à MoovX n'a été vérifié.
Contrôler l'accord effectif, les modèles/endpoints utilisés, les trois langues
et le consentement explicite avant transmission. Une recherche de noms de
consentement IA n'est pas une preuve exhaustive d'absence du mécanisme.

### P1 — fonctionnement sur appareil

Le brouillon de séance versionné contient userId, séries, horodatages et reprise
d'enregistrement (`active-workout-draft.ts`, `session-persistence.ts`). Il est
réutilisable, mais la durée de validité de 24 h et les cas de perte de réponse
serveur doivent être testés explicitement sur iPhone.
Le service worker est push-only ; pas de cache hors ligne général.
Le journal nutrition possède un brouillon en mémoire et des écritures groupées,
sans reprise du brouillon après fermeture. Ne pas annoncer un mode hors ligne.

## 4. Architecture : décision à prendre après prototype

Piste prioritaire à évaluer : client mobile réutilisant React et les modules
métier, interface embarquée et services serveur conservés. Pas de réécriture
globale de l'app ni conversion aveugle du serveur Next.js en export statique.
Capacitor attend des assets web construits avec index.html ; le serveur Next.js
et ses routes API ne sont pas directement un bundle iOS. Qualifier auth,
retours OAuth, stockage de session, origines réseau et appels API avant de
retenir définitivement cette piste. Comparer à une enveloppe Swift/WKWebView
ou un client natif seulement à partir de contraintes mesurées.

## 5. Lots et validations 4/4

Chaque lot est isolé : (1) contrats/types, (2) tests automatisés,
(3) runtime cible, (4) sécurité/non-régression et retour arrière.

| Lot | Livrable | Condition de sortie |
|---|---|---|
| A — sécurité du socle | Checkout authentifié, autorisé et limité ; tests Billing | Aucun effet fournisseur avant refus ; parcours légitime préservé ; 4/4 |
| B — décision mobile | ADR, prototype isolé connexion + séance | Compilation iOS et reprise sur appareil prouvées ; aucun secret embarqué |
| C — fiabilité | Sauvegardes et reprise, clavier, safe areas, permissions | Matrice interruption/réseau/app kill exécutée ; pas de perte silencieuse |
| D — paiements et confidentialité | Flux Apple qualifié, droits synchronisés, déclarations exactes | Achat/restauration/expiration testés en sandbox ; consentements vérifiés |
| E — TestFlight | Build signé, notes, accès test et campagne privée | Parcours complet sur appareils réels ; aucun P0/P1 bloquant ouvert |
| F — App Store | Dossier, captures, support, suppression et compte de revue | Checklist Apple satisfaite et go/no-go explicite ; approbation Apple non garantie |

Tests appareil minimum : inscription, retour email/Apple, onboarding, génération
avec reprise après réseau interrompu, séance simple et avancée, verrouillage,
appel, redémarrage, enregistrement nutrition, caméra refusée/autorisée,
changement de compte, achat/restauration, suppression de compte.
Pas de données production copiées en staging, pas de paiement réel de test.

## 6. Prompt d'exécution du prochain lot

**Tâche :** sécuriser le checkout plateforme existant.
**Scope :** route checkout et tests associés ; lire ses appelants, règles de rôle,
schéma paiement et webhook avant modification. Pas de migration ni refonte UI.
**Contexte :** main au SHA ci-dessus ; clientId est actuellement fourni par le
client sans contrôle utilisateur dans la route.
**Logique :** session vérifiée serveur, propriétaire contrôlé, plans autorisés,
attribution coach vérifiée, limite de débit ; erreurs génériques. Préserver les
abonnements existants et les redirects autorisés. Ne pas inventer de droits admin.
**Validations 4/4 :** TypeScript ; tests 401/403/429/succès ; runtime local avec
Stripe simulé et base jetable ; revue des secrets/effets/non-régression/rollback.
**Livrable :** correctif minimal, tests, cause racine et résultats dans rapport.
**Contraintes :** pas de fusion staging, pas de clé réelle en sortie, pas d'appel
Stripe live, pas de changement de tarif, commits isolés après tests runtime.

## Sources externes consultées

- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — TestFlight](https://developer.apple.com/testflight/)
- [Capacitor — installation](https://capacitorjs.com/docs/next/getting-started)
- [Anthropic — conservation API](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)

Cet audit n'a ni clos les phases 9/10, ni exécuté leurs observations, ni modifié
la production. Les tests 1 991/31 de la livraison nutrition précédente restent
des preuves de ce lot, pas une certification générale App Store.

## 7. Lot A1 — frontière de confiance du checkout plateforme

Correctif du 23 septembre, limité à `/api/stripe/checkout` :

- Session vérifiée par `getUser()` serveur avant tout accès privilégié.
- Identifiant du bénéficiaire identique à l'utilisateur connecté ; rôles lus
  en base, pas dans les métadonnées modifiables de l'utilisateur.
- Offres client réservées au rôle client, offre coach au rôle coach.
- Attribution coach conforme au repository existant : relation active unique,
  source invitation/admin, identifiant correspondant. Refus des états ambigus.
- Limite de cinq tentatives par minute et utilisateur, avec `Retry-After`.
- Échec de lecture du destinataire : aucun checkout créé. Échec d'enregistrement
  du paiement : aucune URL retournée et expiration Stripe tentée. Si elle échoue,
  événement générique distinct dans les logs, sans détails fournisseur sensibles.
- Tarifs, chemins de retour et destination Connect existants conservés.

Preuves locales : 2 023 tests unitaires/composants passent, dont 32 tests de route
(Stripe et accès Supabase simulés), TypeScript, parité i18n et build production OK ;
requête HTTP réelle sans session refusée avec 401 sur Next.js local.
La suite d'intégration DB existante passe ses 31 tests sur données synthétiques ;
elle n'est pas un test de paiement Stripe de bout en bout. Aucun achat réel,
aucun changement de schéma ni écriture dans les comptes de production.

Limites explicites : limite de débit en mémoire par instance (pas distribuée),
idempotence inter-requêtes à renforcer, checkout coach distinct et webhook à
qualifier séparément. A1 ne certifie donc pas l'ensemble Billing et ne clôt pas A.
Retour arrière applicatif : revert du commit A1, sans rollback de données ;
cela réouvrirait la faille initiale et doit être une décision d'incident explicite.

Compte Apple : capture fournie par Marco avec `Enrollment Pending` ; adhésion
encore non confirmée. Cela n'empêche pas les travaux locaux, mais aucune
distribution TestFlight ni signature de livraison n'est revendiquée.
