# Harnais E2E — chat Athena

Le scénario traverse Chromium mobile, l'interface `ChatAI`, Supabase Auth/PostgREST/PostgreSQL local, `POST /api/chat-ai`, la relecture serveur du profil et de l'historique, puis un endpoint Anthropic HTTP local déterministe sur `127.0.0.1:55330`.

## Frontière Anthropic locale

La production conserve exactement `https://api.anthropic.com/v1/messages`. La redirection n'est possible que si `MOOVX_E2E=1` et si `ANTHROPIC_E2E_MESSAGES_URL` désigne exactement `http://127.0.0.1:55330/v1/messages` ou l'équivalent `localhost`, sans query ni fragment. Ces variables sont injectées dans le processus Next.js par le runner et ne sont pas contrôlables depuis le navigateur.

Le faux serveur accepte uniquement `POST /v1/messages`. Son API de contrôle locale permet les réponses normale, Markdown autorisé, hostile, `429`, `500` et JSON malformé. Il mémorise uniquement le corps fonctionnel nécessaire aux assertions ; aucune clé, autorisation, cookie ou profil complet n'est journalisé.

## Contrat vérifié

- anonyme et abonnement `invited` refusés avant Anthropic ;
- session réelle et identité serveur, sans identifiant fourni par le navigateur ;
- profil synthétique relu côté serveur et présent dans le prompt système ;
- historique réel limité au bon compte et message utilisateur borné à 500 caractères ;
- modèle `claude-sonnet-4-6` et `max_tokens: 1024` ;
- persistance user/assistant, rechargement et suppression par l'interface ;
- quota horaire refusé avant Anthropic ;
- `429`, `500` et JSON malformé retournés sans crash du processus ;
- charges `script`, `img`, `svg`, `iframe`, attributs événementiels, pseudo-liens et HTML mal fermé restent du texte ;
- titres, liste, gras et retours à la ligne autorisés restent rendus ;
- aucun dialogue hostile et aucune origine navigateur extérieure à Next/Supabase local.

```bash
npm run supabase:local:reset
npm run test:e2e:chat
```

Playwright utilise un worker, sans trace ni capture. Le runner arrête Next.js et le faux Anthropic dans son nettoyage de groupe de processus.

## Limites

Le garde d'origine observe le réseau navigateur et la destination serveur Anthropic explicitement validée ; ce n'est pas un bac à sable réseau système général. Les échecs forcés d'insertion du message utilisateur ou assistant ne sont pas injectés dans cet E2E, car cela imposerait de mocker PostgREST ou d'altérer temporairement le schéma réel. Leur ordre contractuel reste visible dans la route : insertion utilisateur avant Anthropic, insertion assistant en best effort après réponse.
