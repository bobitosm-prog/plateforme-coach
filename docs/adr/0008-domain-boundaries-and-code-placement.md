# ADR 0008 — Frontières de domaines et placement du code

- Statut : accepted
- Date : 2026-08-08

## Contexte

MoovX possède des modèles et modules structurés pour Training, Nutrition,
Progression, Billing, IA et Coaching, mais aussi des composants, hooks et
utilitaires historiques qui mélangent orchestration, persistance et
présentation. Sans règle commune, un nouveau cas d'usage peut être ajouté dans
un dashboard, une route ou la racine de `lib/`, créant une seconde autorité
métier et des dépendances transverses implicites.

La [carte des domaines](../DOMAIN_MAP.md) décrit l'état observé. Cet ADR fixe la
direction de dépendance et le placement attendu pour le nouveau code ; il
n'impose aucun déplacement mécanique immédiat du legacy.

## Décision

Le flux de dépendance normal est unidirectionnel :

```text
UI / HTTP
  → orchestration applicative
    → domaine / services
      → repositories / ports
        → Supabase ou fournisseur externe
```

### UI et HTTP

`app/` porte les pages, composants, hooks de présentation et adaptateurs HTTP.
Il ne constitue pas l'autorité métier. Une route parse et valide l'entrée,
établit identité et autorisation, appelle un service puis mappe le résultat ;
elle ne devient pas le modèle partagé du domaine.

### Orchestration applicative

Les dashboards, loaders et compositions coach/client peuvent coordonner
plusieurs domaines. Ils organisent chargement, séquence et présentation, mais
ne possèdent ni leurs tables, ni leurs règles d'accès, ni leurs formules. Une
composition transverse consomme des résultats bornés provenant de services,
repositories ou read models explicites.

### Domaine et services

Les modèles, invariants, calculs et cas d'usage réutilisables vivent sous
`lib/<domaine>/`. Un domaine possède les règles de ses écritures. Il ne lit pas
directement les tables d'un autre domaine : il reçoit un port, un read model ou
une projection autorisée dont le propriétaire reste explicite.

### Repositories et ports

Un repository encapsule des projections et mutations d'une source donnée. Il
reçoit son client ou son port ; il ne crée pas arbitrairement un client
navigateur, serveur ou privilégié. Injecter un client admin ne prouve aucune
autorisation.

Un fournisseur externe est placé derrière un port du domaine et un adaptateur
séparé. Le SDK, son payload et ses erreurs ne deviennent pas le modèle métier.

### Autorité et sécurité

La session serveur établit l'identité des opérations sensibles et la RLS reste
une frontière obligatoire sur les données utilisateur. Un filtre UI, un ID du
navigateur, un cache ou un repository ne remplace jamais ces contrôles. La clé
`service_role` reste côté serveur et n'est construite qu'après les gardes
requises, sauf traitement système explicitement borné.

### Legacy

Les fichiers historiques à la racine de `lib/`, les hooks multi-domaines et les
accès directs existants sont tolérés pendant la migration progressive. Ils ne
sont pas le placement recommandé pour le nouveau code. Avant d'étendre un tel
fichier, l'auteur identifie le domaine propriétaire et ajoute la logique dans
sa frontière, ou documente pourquoi une extraction sûre n'est pas encore
possible.

## Conséquences

- Une nouvelle fonctionnalité a un propriétaire métier explicite.
- Les dépendances transverses passent par des contrats testables plutôt que par
  des lectures de tables dispersées.
- Les surfaces `client-dashboard` et `coaching` restent des couches de
  composition.
- Progression peut agréger les faits Training/Nutrition sans posséder leurs
  écritures ; IA peut proposer un résultat sans posséder sa persistance ;
  Billing peut consulter une relation sans la créer.
- Les revues peuvent vérifier le placement et l'autorité avant de discuter la
  forme interne du code.

## Limites et dette restante

- Cette décision ne déplace aucun module legacy et n'interdit pas une migration
  progressive par caractérisation.
- Certains domaines conservent plusieurs formats ou historiques ; la carte les
  signale sans les fusionner.
- Les repositories ne couvrent pas encore toutes les mutations.
- Les cartes détaillées de dépendances doivent rester simples et factuelles ;
  elles ne remplacent ni les tests RLS, ni les contrats de domaine.

## Références

- [Carte des domaines](../DOMAIN_MAP.md)
- [Guide d'onboarding développeur](../DEVELOPER_ONBOARDING.md)
- [Guide de contribution](../CONTRIBUTING.md)
- [Frontières Supabase](0003-supabase-access-boundaries.md)
- [Contrats des routes API](0004-api-route-contracts.md)
- [Checklist de revue](../CODE_REVIEW_CHECKLIST.md)
