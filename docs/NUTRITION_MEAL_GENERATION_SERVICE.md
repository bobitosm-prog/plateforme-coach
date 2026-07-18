# Service de génération de plans alimentaires

## Périmètre

La frontière concerne uniquement `POST /api/generate-meal-plan`. Les autres
routes IA ne sont pas migrées. Les producteurs historiques continuent de lire
un flux SSE composé de sept événements `progress`, puis d'un événement `done`
contenant le même plan canonique toléré par `lib/meal-plan.ts`.

## Responsabilités

- La route conserve l'authentification Supabase, les limites IP et IA, le quota,
  la garde `invited`, la validation HTTP, le correlation ID et le mapping SSE.
- `lib/nutrition/meal-generation/service.ts` construit les prompts métier,
  orchestre les sept jours, parse et valide chaque réponse, puis convertit le
  format français historique vers `DayPlan`.
- `provider.ts` est le seul transport Anthropic. Il reçoit le prompt par un port
  injecté et ne retourne que du texte validable ou un code de raison borné.
- Aucun repository n'est appelé : la route historique reçoit les préférences
  dans son corps et n'effectue aucune lecture Nutrition. Ajouter une lecture
  aurait modifié son contrat et son autorité. L'identité utilisée pour quota et
  rôle reste exclusivement celle de la session serveur.

## Contrats préservés

- modèle `claude-opus-4-8`, `max_tokens: 1500`, prompt métier et ordre lundi à
  dimanche ;
- statuts et corps legacy pour authentification, limites, quota, garde de rôle
  et configuration fournisseur ;
- en-têtes SSE et événements `progress`/`done` ;
- échec d'un jour isolé sous la forme historique d'un `DayPlan` vide, sans faire
  échouer les six autres jours ;
- aucune écriture du plan : les producteurs restent responsables de leur
  persistance après réception du flux.

La validation d'entrée rejette désormais explicitement en `400` les objectifs
nutritionnels absents, non finis, négatifs ou hors bornes. Les champs legacy
additionnels restent acceptés pour ne pas rompre les producteurs actuels.

## Validation et confidentialité

Une journée fournisseur doit contenir les quatre repas historiques et des
aliments nommés avec quantité strictement positive et macros finies,
non négatives. JSON malformé, structure inconnue, valeur négative, `NaN` ou
infini sont fail-closed pour la journée concernée.

Le transport n'expose jamais corps fournisseur, prompt, clé, e-mail ou erreur
brute. Les seuls diagnostics qui franchissent le port sont
`PROVIDER_RATE_LIMITED`, `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE` et
`PROVIDER_INVALID_RESPONSE`. Les logs HTTP structurés ne contiennent que le
résultat borné et le correlation ID.

## Limites

- La tolérance par journée peut produire un plan partiel ; le flux legacy ne
  possède pas de champ public signalant quelles journées ont échoué.
- La consommation du quota reste enregistrée avant le démarrage du flux, comme
  auparavant.
- La génération reste séquentielle et ne persiste rien ; transactionnalité et
  idempotence des écritures effectuées ensuite par les producteurs sont hors
  périmètre.
- Préférences et analyses déjà envoyées par les producteurs entrent dans le
  prompt, mais ne sont jamais journalisées.

## Références

- [Inventaire des formats](NUTRITION_FORMATS_INVENTORY.md)
- [Modèle canonique](NUTRITION_CANONICAL_MODEL.md)
- [Repositories Nutrition](NUTRITION_REPOSITORIES.md)
- [Validation API](API_VALIDATION.md)
- [Observabilité API](API_OBSERVABILITY.md)
