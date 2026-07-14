# Mocks de fournisseurs pour Vitest

Les contrats sous `tests/mocks/` isolent les tests de modules et de routes. Ils ne remplacent ni les adaptateurs de production, ni les fixtures métier, ni les faux serveurs HTTP utilisés par Playwright.

| Fournisseur | API test | Opérations couvertes réellement utilisées |
|---|---|---|
| Stripe | `stripeMock` | Checkout create/retrieve, Connect create/retrieve/link, produits, prix, customers, construction et replay webhook |
| Anthropic | `anthropicMock`, `anthropicCalls` | `messages.create` du SDK et `fetch /v1/messages`; texte, outil structuré, réponse malformée, 429 et 500 |
| SMTP | `smtpMock` | `createTransport`, `sendMail`, succès, refus 550 et indisponibilité |
| Web Push | `webPushMock` | `setVapidDetails`, `sendNotification`, succès, 404, 410, 429 et 500 |

Chaque module enregistre un `beforeEach` Vitest qui vide réponses configurées et historiques. Une opération sans résultat configuré échoue explicitement. Les réponses sont synthétiques et aucune implémentation n'ouvre de socket.

## Exemples

Stripe conserve aussi le second argument, notamment l'idempotence :

```ts
import { stripeMock } from '../mocks/stripe'

vi.mock('stripe', async () => ({
  default: (await import('../mocks/stripe')).stripeMock.constructor,
}))

stripeMock.succeed('checkout.sessions.create', { id: 'cs_test_1' })
expect(stripeMock.calls['checkout.sessions.create']).toHaveBeenCalledWith(
  expect.objectContaining({ metadata: expect.any(Object) }),
  expect.objectContaining({ idempotencyKey: expect.any(String) }),
)
```

Anthropic propose le même état pour le SDK et le transport HTTP direct :

```ts
anthropicMock.text('Réponse synthétique')
anthropicMock.tool({ exercise: 'squat' })
anthropicMock.fail(429)
anthropicMock.malformed()
```

Le `system` Anthropic est enregistré sous `[REDACTED_SYSTEM_PROMPT]`. Les messages restent disponibles pour vérifier leur structure; ils doivent toujours contenir des données synthétiques.

SMTP et Web Push :

```ts
smtpMock.succeed()
smtpMock.refuse()
smtpMock.unavailable()

webPushMock.succeed()
webPushMock.fail(410)
```

La clé VAPID privée n'est jamais conservée. Les messages SMTP expurgent les jetons Base64URL de 43 caractères. Les destinataires et endpoints doivent utiliser exclusivement `example.test` ou des hôtes synthétiques non routables.

## Choisir le bon double

- Utiliser ces mocks Vitest pour validation, autorisation, métadonnées, idempotence et gestion d'erreurs dans un seul processus.
- Utiliser `tests/fixtures/` pour les personas, rôles, abonnements et relations : une fixture métier n'est pas un fournisseur.
- Utiliser `scripts/fake-*-server.mjs`, Mailpit et les commandes E2E dédiées lorsqu'il faut traverser le vrai SDK ou transport réseau de l'application.
- Ne jamais appeler un test « E2E » lorsque Stripe, Anthropic, SMTP, Web Push, Supabase ou une autre frontière principale est remplacée dans le processus par `vi.mock`.

Les faux serveurs E2E restent volontairement distincts : Stripe `55326`, Web Push `55328/55329`, Anthropic `55330` et Mailpit `55324/55325`.

## Inventaire au 14 juillet 2026

- Stripe est construit dans six modules de production : Checkout plateforme/coach, Connect, vérification de compte, configuration produits/prix et webhook, plus l'adaptateur admin. Les opérations observées sont celles de la table ci-dessus; aucune autre surface du SDK n'est simulée.
- Anthropic possède un appel SDK (`generate-exercise-instructions`, plus un script de backfill) et onze chemins applicatifs utilisant `fetch` vers `/v1/messages`. Aucun appel `messages.stream` du SDK n'existe actuellement; les SSE MoovX encapsulent des réponses HTTP non streamées du fournisseur.
- SMTP passe par `lib/email.ts`, qui utilise une création de transport et un envoi par message. Les routes consomment ensuite `sendEmail`.
- Web Push est utilisé par `lib/push-server.ts` et le diagnostic hebdomadaire avec configuration VAPID puis livraison par abonnement.

Avant cette tranche, cinq suites Stripe reconstruisaient leur propre pseudo-SDK et la suite Push recréait deux fonctions locales. Deux suites Stripe et la suite Push consomment maintenant les contrats partagés; les trois anciennes suites Stripe restent volontairement inchangées pour limiter cette migration. Le test SMTP descend désormais jusqu'à la frontière Nodemailer. Les tests de contrat Anthropic démontrent conjointement le SDK et `fetch`, faute de suite unitaire de route Anthropic préexistante à migrer.
