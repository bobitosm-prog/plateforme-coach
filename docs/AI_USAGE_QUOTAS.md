# Quotas et journalisation d'usage IA

> Contrat actif au 20 juillet 2026. Les quinze features passent par une
> réservation PostgreSQL commune avant leur transport fournisseur.

## Compatibilité caractérisée

Avant la migration, `checkAiRateLimit()` et `checkAiQuota()` exécutaient un
`COUNT`, puis `logAiUsage()` insérait séparément. Les lectures et insertions en
erreur échouaient ouvertes. `success` valait `true` par défaut : Chat écrivait
après succès, alors que Meal Plan, Meal Photo, Suggest Exercise, Custom
Program, Body, Progress Photo et Weekly Diagnostic écrivaient avant le
fournisseur. Un échec de ces derniers consommait donc l'heure et, pour les
quatre usages lourds, les 30 jours.

Les anciennes lignes restent intactes. La RPC les compte encore par
`endpoint`/`created_at` : toutes comptent dans leur fenêtre horaire historique,
et seules celles avec `success=true` comptent dans le quota lourd historique.

## Matrice des quinze features

| Feature | Principal | Limite DB conservée | Runtime commun |
|---|---|---|---|
| `chat-ai` | session | 20 / heure | réservation + finalisation |
| `generate-recipe` | session | aucune | journalisation illimitée |
| `generate-meal-plan` | session | 10 / heure + lourd | réservation + finalisation SSE |
| `analyze-meal-photo` | session | 15 / heure | réservation + finalisation |
| `suggest-exercise` | session | 20 / heure | réservation + finalisation |
| `adapt-workout` | session | aucune | journalisation illimitée |
| `generate-exercise-instructions` | session admin | aucune | une opération batch journalisée |
| `generate-program` | session | aucune | journalisation illimitée |
| `generate-custom-program` | session | 5 / heure + lourd | réservation + finalisation SSE |
| `training-regen` | serveur + utilisateur cible | aucune | une réservation par utilisateur |
| `suggest-overload` | session | aucune | journalisation illimitée |
| `analyze-body` | session | 5 / heure + lourd | réservation + finalisation |
| `analyze-progress-photo` | session | 10 / heure + lourd | réservation + finalisation |
| `weekly-diagnostic` | session | aucune | journalisation illimitée |
| `weekly-diagnostic-cron` | serveur + utilisateur cible | aucune | une réservation par utilisateur |

Le quota lourd reste exactement six succès ou réservations actives sur 30
jours glissants, partagé par Meal Plan, Custom Program, Body et Progress Photo.
Les limites IP historiques restent indépendantes et inchangées.

## Schéma durable et RPC

La migration
`20260720190000_atomic_ai_usage.sql` ajoute sans backfill destructif :

- correlation ID unique, feature, policy ID et principal technique ;
- `reserved`, `success`, `failed` ou `cancelled` ;
- réservation, expiration à 15 minutes et finalisation ;
- modèles logique/fournisseur, tokens optionnels, total seulement calculable ;
- durée 0–300 000 ms, 1–10 tentatives ;
- coût entier en micros USD et statut `complete`, `partial`, `unavailable` ou
  `invalid`.

Les chaînes sont bornées et les tokens/coûts négatifs sont refusés. Aucun champ
ne peut contenir prompt, réponse, image, e-mail, payload ou secret.

`reserve_ai_usage` dérive l'utilisateur de `auth.uid()`. La variante
`reserve_ai_usage_server` reçoit l'utilisateur cible et un principal serveur,
mais n'est exécutable que par `service_role`. Les limites sont résolues dans la
fonction SQL, jamais fournies par le navigateur. Deux advisory locks
transactionnels sérialisent `utilisateur + feature` et, pour les usages lourds,
`utilisateur + heavy-ai`.

`finalize_ai_usage` et sa variante serveur vérifient réservation, correlation,
principal, feature, policy et modèle logique. Une répétition identique est
idempotente; une répétition contradictoire retourne `conflict` et ne rouvre
jamais la ligne.

## Comptage et panne partielle

Une réservation active compte immédiatement. Une réservation non finalisée
reste comptée pendant 15 minutes, puis expire. Un succès finalisé reste compté;
un échec ou une annulation finalisés libèrent la place. Cela corrige la dette
historique des échecs pré-fournisseur enregistrés comme succès, sans réécrire
les anciennes lignes.

Une panne de finalisation laisse la ligne `reserved`; elle n'offre donc pas de
place immédiate. La reprise peut rejouer la même finalisation grâce à
l'idempotence RPC. Aucun retry automatique n'est ajouté par cette tranche.
Une panne de réservation échoue fermée pour les sept quotas DB. Les features
historiquement sans quota conservent leur disponibilité et omettent seulement
le log technique pendant la panne, comme leur comportement legacy.

## RLS et grants

- `anon` : aucun accès table ou RPC ;
- `authenticated` : lecture de ses lignes seulement, aucun INSERT/UPDATE/DELETE
  direct, uniquement les RPC utilisateur ;
- `service_role` : table et RPC serveur nécessaires ;
- fonctions internes, helpers de policy et RPC serveur : refusés à PUBLIC,
  anon et authenticated ;
- toutes les fonctions `SECURITY DEFINER` fixent `search_path=''` et qualifient
  les objets.

## Frontières TypeScript

[`lib/ai/usage`](../lib/ai/usage/) expose les policies, décisions, événements,
coûts, service pur, adaptateur Supabase injecté et façade runtime. L'identité
utilisateur vient du client de session; les cron utilisent un principal serveur
et un `subjectUserId` explicites. Les erreurs PostgreSQL sont réduites à des
résultats discriminés sans message brut.

Les métadonnées Anthropic ne sont enregistrées que lorsqu'elles existent.
Zéro token reste différent d'une valeur absente. L'estimation de coût utilise
le [registre modèles/coûts](AI_MODEL_COST_REGISTRY.md) et n'est jamais une
facture.

## Preuves locales

- `tests/integration/ai-usage-rpc.sql` : schéma, valeurs bornées, lignes legacy,
  expiration, succès/échec/annulation, répétition et RLS/grants ;
- `tests/integration/ai-usage-concurrency.sh` : avec 19 places actives sur 20,
  deux transactions concurrentes donnent exactement un `allowed` et un
  `denied` ;
- `tests/unit/ai-usage-*.test.ts` : policies, coût, adapter, expurgation et
  raccordement exact des quinze consommateurs.

Les fixtures SQL sont annulées ou supprimées; la vérification finale retrouve
zéro correlation synthétique résiduelle.

## Limites restantes

- `/api/ai-quota` reste un lecteur de compatibilité du compteur lourd finalisé;
- les flux qui ne reçoivent pas de compteurs fournisseur conservent des tokens
  inconnus, jamais zéro inventé ;
- trois flux utilisent l'interface provider commune; les douze autres restent
  à migrer sans modifier leurs quotas ;
- les réponses métier ne sont pas mises en cache par correlation ID : une
  reprise ne consomme pas une seconde place, mais le transport doit encore
  gérer sa propre idempotence métier.

## Références

- [Inventaire IA](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Registre des modèles et coûts](AI_MODEL_COST_REGISTRY.md)
- [Interface provider](AI_PROVIDER_INTERFACE.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
- [Types Supabase](SUPABASE_TYPES.md)
