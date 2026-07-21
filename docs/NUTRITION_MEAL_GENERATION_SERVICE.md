# Service de génération de plans alimentaires

## Périmètre

La frontière concerne uniquement `POST /api/generate-meal-plan`. Les autres
routes IA ne sont pas migrées. Les producteurs historiques continuent de lire
un flux SSE composé de sept événements `progress`, puis d'un événement `done`
contenant le même plan canonique toléré par `lib/meal-plan.ts`.

## Responsabilités

- La route conserve l'authentification Supabase, les limites IP et IA, le quota,
  la garde `invited`, la validation HTTP, le correlation ID et le mapping SSE.
  Aucun contrôle d'abonnement indépendant n'existait dans cette route; aucun
  n'est inventé pendant cette migration.
- `lib/nutrition/meal-generation/service.ts` orchestre les sept jours, transmet
  les prompts métier au `AiProvider`, valide chaque réponse par le schéma Zod,
  puis convertit le format français historique vers `DayPlan`.
- L'adaptateur Anthropic commun est l'unique transport. L'ancien `provider.ts`
  Nutrition a été supprimé; aucune abstraction fournisseur concurrente ne
  subsiste dans le domaine.
- Aucun repository n'est appelé : la route historique reçoit les préférences
  dans son corps et n'effectue aucune lecture Nutrition. Ajouter une lecture
  aurait modifié son contrat et son autorité. L'identité utilisée pour quota et
  rôle reste exclusivement celle de la session serveur.

## Contrats préservés

- modèle logique `anthropic-opus-4.8` résolu vers `claude-opus-4-8`,
  `max_tokens: 1500`, sans température, prompt métier et ordre lundi à dimanche ;
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

Le provider n'expose jamais corps fournisseur, prompt, clé, e-mail ou erreur
brute. Ses erreurs normalisées restent internes au service; le navigateur ne
reçoit aucun contenu fournisseur. Les logs HTTP structurés ne contiennent que
le résultat borné et le correlation ID.

Une journée dont les quatre listes de repas sont légitimement vides reste une
journée validée avec quatre repas vides. Une sortie invalide ou une panne
fournisseur devient le `DayPlan` vide legacy et positionne `partial=true` en
interne. Ce marqueur n'est toujours pas ajouté à l'événement public `done`.

## SSE, annulation et usage

- Le SSE reste applicatif, non natif fournisseur : un `progress` avant chaque
  appel, dans l'ordre lundi–dimanche, puis exactement un `done` après sept
  tentatives lorsque le traitement arrive à son terme.
- Les sept appels partagent le même correlation ID et une seule réservation.
  `Request.signal` est propagé; une annulation arrête les jours suivants,
  finalise `cancelled` avec le nombre réel de tentatives et ferme une seule fois.
- Tokens input/output et modèle réel sont agrégés. Tous les compteurs présents
  donnent `complete`; certains présents donnent `partial`; aucun compteur donne
  `unavailable`. Le coût est calculé en entiers micros par la frontière usage.
- Le code observé impose **3/min par IP**, et non 5/min. Cette valeur est
  conservée pour éviter une modification de quota pendant la migration. Les
  limites 10/h et 6 opérations lourdes sur 30 jours restent inchangées.

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
- `AiProvider.stream()` reste inutilisé; il ne faut pas présenter le SSE
  applicatif comme du streaming Anthropic natif.

## Références

- [Inventaire des formats](NUTRITION_FORMATS_INVENTORY.md)
- [Modèle canonique](NUTRITION_CANONICAL_MODEL.md)
- [Repositories Nutrition](NUTRITION_REPOSITORIES.md)
- [Validation API](API_VALIDATION.md)
- [Observabilité API](API_OBSERVABILITY.md)
