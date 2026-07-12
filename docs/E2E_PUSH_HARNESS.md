# Harnais E2E — notifications push

Le scénario utilise le producteur réel de messagerie coach, `POST /api/send-notification`, Supabase Auth/PostgREST/PostgreSQL, la bibliothèque `web-push` et une terminaison HTTPS locale sur `127.0.0.1:55328`. Un serveur de contrôle non sensible écoute sur `127.0.0.1:55329`.

Le runner génère une paire VAPID éphémère. La souscription locale utilise une paire P-256 et un secret d'authentification synthétiques. En mode E2E, `lib/push-server.ts` refuse tout endpoint qui n'est pas HTTPS et local. Le serveur ne conserve ni autorisation, ni clés, ni contenu chiffré : uniquement chemin, taille, encodage et TTL.

Le parcours couvre les refus anonyme, auto-notification, relation étrangère, rôle invité et URLs hostiles avant livraison. Il vérifie le succès, le nettoyage sur `410` et la conservation de la souscription sur `500`.

Le script `/sw.js` réellement enregistré est exécuté par Chromium. Playwright ne permet pas un clic système portable : le test construit l'événement `notificationclick` dans le contexte du véritable Worker. Les navigations `/coach` et le repli `/` pour une ancienne URL externe traversent donc le handler réel. Chromium refuse ensuite `focus()` sans activation système ; cette erreur attendue est tolérée après navigation et ne constitue pas un clic UI système automatisé.

```bash
npm run test:e2e:push
```

Deux exécutions consécutives ont réussi en 12,1 s puis 11,5 s.
