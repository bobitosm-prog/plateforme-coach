# Validation des entrées HTTP

Le module [`lib/api/validation.ts`](../lib/api/validation.ts) constitue la frontière commune entre une entrée HTTP non fiable, Zod 4 et le [contrat de réponse API](API_RESPONSE_CONTRACT.md). Il utilise exclusivement `VALIDATION_ERROR` de la [taxonomie](API_ERROR_TAXONOMY.md), avec statut `400`, sans migrer de route dans cette tranche.

## Audit actuel

Zod `4.3.6` est utilisé dans quatre routes admin. Les invitations et le push possèdent aussi des schémas importés puis appelés par `safeParse`. La majorité des 52 routes valide encore manuellement : `request.json()` non protégé, `typeof`, `Array.isArray`, `parseInt`, `searchParams.get`, destructuration et tests de présence.

Les comportements divergent : JSON vide et malformé parfois confondus, clés inconnues souvent acceptées, coercition implicite via `parseInt`, erreurs génériques, et quelques messages ou causes techniques renvoyés. Les objets Zod bruts ne sont pas actuellement exposés, mais une migration naïve pourrait révéler `input`, messages custom, noms sensibles ou valeurs reçues.

## API

```ts
validateValue(request, schema, input)
validateJsonBody(request, schema, options?)
validateQuery(request, schema)
validateRouteParams(request, params, schema)
```

Chaque fonction infère `z.output<typeof schema>` et retourne :

```ts
type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response }
```

La branche erreur est déjà une réponse `ApiFailure<ValidationDetails>` : code `VALIDATION_ERROR`, message contrôlé, `requestId` identique dans le corps et `x-request-id`. Elle ne journalise jamais l'entrée.

### Corps JSON

```ts
const result = await validateJsonBody(request, CreateSchema)
if (!result.ok) return result.response
const command = result.data
```

Par défaut, `Content-Type` doit être `application/json` ou finir par `+json`. Le helper distingue corps vide, JSON malformé, type incorrect et échec de schéma. Il lit le corps une seule fois. La limite applicative par défaut est 1 Mo, contrôlée par `Content-Length` puis par les octets réellement lus; elle complète sans remplacer la limite de l'infrastructure.

### Query parameters

```ts
const result = validateQuery(request, z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive(),
  tag: z.array(z.string()).optional(),
}).strict())
```

Une clé unique devient une chaîne; une clé répétée devient un tableau dans l'ordre reçu. Une clé absente reste absente et `?q=` produit une chaîne vide. Aucune coercition n'est appliquée par le helper : seule une coercition explicitement déclarée dans le schéma, comme `z.coerce.number()`, est autorisée.

### Route parameters et valeur disponible

```ts
const parsed = await validateRouteParams(request, context.params, ParamsSchema)
const value = validateValue(request, ExistingSchema, unknownValue)
```

`validateRouteParams` accepte les paramètres synchrones ou la `Promise` de l'App Router. `validateValue` sert aux valeurs déjà extraites et reste la primitive commune.

## Détails publics

```ts
type ValidationDetails = {
  issues: Array<{ path: string; code: string; message: string }>
  truncated: boolean
}
```

- maximum 8 issues, triées par chemin puis code;
- maximum 12 segments et 120 caractères par chemin;
- segments hostiles normalisés et champs sensibles remplacés par `[redacted]`;
- vocabulaire borné : `invalid_type`, `unknown_key`, `too_small`, `too_big`, `invalid_format`, `invalid_value`, `custom`, plus les erreurs de corps;
- messages entièrement contrôlés; aucun message custom Zod, valeur reçue, stack ou objet `ZodError`;
- aucune propriété `input`, `received` ou donnée brute.

## Validation et erreur métier

La validation établit seulement que l'entrée possède la forme autorisée. Une relation coach inactive, un quota consommé, un conflit Stripe ou une ressource absente est une erreur métier et doit employer le code canonique correspondant. Un `refine` convient à un invariant local de la commande; il ne doit pas interroger Supabase ou un fournisseur.

## Migration ultérieure d'une route

1. caractériser son ancien traitement du body/query/params et ses consommateurs;
2. déclarer un schéma strict et des coercitions explicites;
3. ajouter les tests de compatibilité de l'ancien corps pendant au moins une release;
4. remplacer uniquement la frontière de validation par le helper;
5. vérifier le `requestId`, les détails publics et l'E2E concerné;
6. supprimer le format legacy dans une tranche séparée.

Les routes existantes ne sont pas modifiées ici. La migration des huit routes simples reste une tâche Phase 2 distincte.
