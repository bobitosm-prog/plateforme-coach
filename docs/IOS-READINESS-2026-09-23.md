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

## Actualisation terrain — 4 octobre 2026

Vérification directe dans App Store Connect, après livraison des correctifs
consentement Anthropic et séance (PR97–99). La version 1.0 est toujours
« À finaliser avant soumission » ; elle n'est pas en cours d'examen Apple.

| Élément | État observé |
|---|---|
| Contrat gratuit | Actif |
| Contrat payant | En attente d’infos de l’utilisateur |
| W-8BEN | Informations fiscales manquantes |
| Compte bancaire | Traitement en cours ; bannière de délai 24 heures toujours affichée |
| Statut DSA | En cours de vérification |
| Confidentialité App Store | 14 catégories sélectionnées, finalités/liens/suivi à configurer ; bouton Publier désactivé |
| Captures iPhone 6,5 pouces | 0/10 |
| Version 1.0 — build | Aucun build sélectionné |
| Informations de revue | Connexion requise cochée ; identifiants, coordonnées et remarques vides |
| Métadonnées FR | Description, promotion, mots-clés et URLs support/marketing renseignés |
| Publication après approbation | Automatique, configuration existante non modifiée |

Le dossier Finance 22552312 reste la référence fournie par Marco. L'absence de
changement dans App Store Connect ne prouve pas l'absence d'une réponse par email.

### Correction documentaire de ce lot

La politique publiée disait encore « exclusivement Stripe » et gardait un
placeholder d'adresse dans sa dernière section. Le texte décrit désormais les
achats intégrés Apple et les paiements web Stripe, les références/états de
transaction associés au compte MoovX et le rôle d'Apple avec sa notice officielle.
L'adresse finale reprend celle déjà présente dans l'en-tête de la politique.
Date/version synchronisées : 4 octobre 2026, 1.1, dans les trois langues.

Cette correction factuelle ne vaut pas audit juridique exhaustif. Les affirmations
anciennes de conservation (notamment conversations Athena 90 jours et logs 12 mois)
et leurs mécanismes effectifs de purge doivent encore être rapprochés avant de
déclarer la fiche App Store définitivement vérifiée.

### Suite de préparation

1. Finaliser les 14 catégories de confidentialité à partir d'un inventaire des
   flux réels, partenaires compris. Le consentement Anthropic ne dispense pas
   de déclarer les données collectées.
2. Préparer les captures à partir de l'app réelle avec données de démonstration,
   puis fournir un compte de revue dédié et ses consignes.
3. Rattacher le build candidat après recette achats Apple sandbox complète.
4. Vérifier la correction fiscale, la banque, le DSA et les produits avant
   toute soumission/commercialisation. Aucun formulaire fiscal ni accord
   contractuel n'a été soumis pendant cet audit.

Références Apple consultées le 4 octobre 2026 :
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- https://www.apple.com/legal/privacy/data/en/app-store/

### Fiche de confidentialité préparée — 4 octobre 2026

Les 14 catégories initiales ont été configurées dans App Store Connect. Deux
catégories supplémentaires ont été ajoutées après lecture du code et des SDK :
numéro de téléphone (`ProfileTab` et fiche client) et emplacement approximatif
(pays/région/ville des statistiques Vercel, sans permission GPS).

| Catégories | Finalités déclarées |
|---|---|
| Nom, email, téléphone, assistance, identifiant utilisateur, achats | Fonctionnalité de l'app |
| Santé, activité physique, messages, photos/vidéos, autre contenu, autres données | Fonctionnalité et personnalisation |
| Interaction produit, performance | Fonctionnalité et analyses |
| Autres diagnostics | Fonctionnalité |
| Emplacement approximatif | Analyses |

Les 16 catégories sont déclarées liées à l'identité, sans suivi publicitaire.
Ne pas présenter la télémétrie comme anonymisée : `AnalyticsGate` utilise
`@vercel/analytics/react` sans filtrage `beforeSend`, et les routes client peuvent
contenir des identifiants. Une réduction des URL collectées mérite un lot séparé.
Référence fournisseur : https://vercel.com/docs/analytics/privacy-policy.

L'aperçu Apple affiche les 16 catégories et le bouton Publier est devenu actif.
La publication finale reste en attente de confirmation de Marco : le dialogue
Apple atteste l'exactitude, la conformité et l'engagement de mise à jour.
Ce paramétrage n'est ni une soumission du build ni une validation juridique complète.

Conservation vérifiée en lecture seule sur la production : le job
`purge-chat-ai-messages` est actif à 03:00 UTC et supprime les messages de plus
de 30 jours. Ses exécutions des 2, 3 et 4 octobre ont réussi. La politique 1.2
remplace donc l'ancienne mention de 90 jours par une description exacte de la
purge quotidienne dans la base active, distincte de la conservation Anthropic.
Aucun message utilisateur n'a été consulté et aucune donnée n'a été modifiée.
La conservation des autres journaux et sauvegardes reste à rapprocher.

### Captures App Store — préparation, images encore à produire

Le code natif actuel ouvre encore `PrototypeHome`, puis `PrototypeBrowser`
avec le bandeau TEST / PRODUCTION et le bouton Fermer. Ces éléments font partie
de l'interface livrée : ne pas les masquer artificiellement sur les captures.
Préparer d'abord le shell natif candidat, le tester, puis capturer cette version.

Séquence prévue, avec compte dédié et données fictives :
1. Accueil : statut du jour, entraînement, nutrition et progression.
2. Séance : colonnes Précédent / kg / répétitions, validation, biset visible.
3. Nutrition : aliments directement visibles dans les cartes de repas.
4. Progression : courbe et historique réellement calculés sur les données fictives.
5. Athena : conversation de démonstration après consentement explicite.

Dimensions acceptées observées sur la fiche iPhone 6,5 pouces : 1242 × 2688
ou 1284 × 2778 en portrait. Aucun screenshot final n'est encore produit ou uploadé.
Ne pas utiliser les données personnelles de Marco ou de Mia pour ces visuels.
