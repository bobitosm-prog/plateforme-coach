# Baseline de performance

## Statut

Baseline Phase 8 capturée le 22 juillet 2026 sur un vrai build Next.js 16.1.6
Webpack de production, servi localement. Deux exécutions complètes du harnais
ont réussi. Chacune reconstruit l'application et mesure trois passages client
mobile et trois passages coach desktop dans des contextes Chromium neufs.

Artefacts bruts et déterministes :

- [`phase-8-baseline-run-1.json`](../perf/baseline/phase-8-baseline-run-1.json),
  `BUILD_ID` `3SsmZGs4buSrw3lXUjHJu` ;
- [`phase-8-baseline-run-2.json`](../perf/baseline/phase-8-baseline-run-2.json),
  `BUILD_ID` `trz-4UEZ9K_w9uD-xZKhc` (baseline principale ci-dessous).

Les plafonds automatisés dérivés de ces captures sont documentés dans
[Budgets de performance](./PERFORMANCE_BUDGETS.md).
La séparation entre la Server Component racine et ses îlots interactifs est
décrite dans [Coque serveur du dashboard](./DASHBOARD_SERVER_SHELL.md).

## Commande canonique

```bash
npm run perf:baseline
```

Un chemin distinct peut être imposé pour une preuve de reproductibilité :

```bash
npm run perf:baseline -- --output perf/baseline/phase-8-baseline-run-2.json
```

Le runner :

1. vérifie le contrat Supabase strictement local et Mailpit vide ;
2. exécute `next build --webpack` avec télémétrie désactivée dans
   `.next-performance-baseline` ;
3. exige `BUILD_ID`, `build-manifest.json`, `routes-manifest.json`,
   `prerender-manifest.json` et `server/app-paths-manifest.json` ;
4. sert ce build avec `next start` sur `127.0.0.1:3211` ;
5. crée et supprime les personas et données synthétiques dans un `finally` ;
6. bloque toute origine navigateur autre que `localhost`/`127.0.0.1` ;
7. ferme Chromium et Next, contrôle le port 3211 et Mailpit, restaure
   `tsconfig.json`, puis supprime le build temporaire.

## Environnement

| Élément | Valeur |
|---|---|
| Commit | `2025c7135e361866591af9296355fde05587d01d` |
| Date | 22 juillet 2026 |
| Node.js | `v24.14.0` |
| npm | `11.9.0` |
| Next.js | `16.1.6`, Webpack |
| Playwright | `1.61.1` |
| Chromium | `149.0.7827.55` |
| Timezone | `Europe/Zurich` |
| Client mobile | 390 × 844 |
| Coach desktop | 1440 × 900 |
| Réseau autorisé | `localhost`, `127.0.0.1` uniquement |

Les polices sont auto-hébergées selon
[Hébergement local des polices](./LOCAL_FONT_HOSTING.md). Aucun domaine Google
Fonts n'a été demandé ou trouvé dans les artefacts.

## Méthode bundle

Les fichiers communs Next proviennent de `polyfillFiles` et `rootMainFiles` de
`build-manifest.json`. Les chunks JavaScript et CSS App Router proviennent des
trois manifests :

- `server/app/page_client-reference-manifest.js` ;
- `server/app/coach/page_client-reference-manifest.js` ;
- `server/app/client/[id]/page_client-reference-manifest.js`.

Chaque fichier est lu sur disque, mesuré brut et compressé avec gzip niveau 9.
Un fichier présent dans plusieurs routes est classé partagé. L'union globale
est dédupliquée par chemin. Les sections Home/Training/Nutrition partagent la
route `/`; Home/Clients/Messages partagent `/coach`; le détail utilise
`/client/[id]`.

### Tailles du second build

| Route | Brut total | Gzip total | Brut propre | Gzip propre |
|---|---:|---:|---:|---:|
| Client `/` | 3 086 045 o | 886 824 o | 0 o | 0 o |
| Coach `/coach` | 3 109 558 o | 895 710 o | 23 513 o | 8 886 o |
| Détail `/client/[id]` | 3 235 133 o | 921 760 o | 149 088 o | 34 936 o |
| Chunks partagés | 3 086 045 o | 886 824 o | — | — |
| Union globale dédupliquée | 3 258 646 o | 930 646 o | — | — |

Le premier build produit les mêmes octets bruts. Ses totaux gzip sont
respectivement 886 830, 895 716, 921 766 et 930 652 octets, soit une variation
de 6 octets conservée dans l'artefact.

## Méthode Web Vitals

- **LCP** : dernière entrée `largest-contentful-paint` observée sur chaque
  document de production.
- **CLS** : somme des entrées `layout-shift` dont `hadRecentInput` vaut faux.
- **INP** : durée maximale des `PerformanceEventTiming` possédant un
  `interactionId`, après clics Playwright réels. Aucun temps de navigation
  Playwright n'est utilisé comme substitut.
- Le parcours client est un document SPA. Le parcours coach comporte le
  document `/coach` puis `/client/[id]`; son LCP et son INP sont le maximum des
  deux segments, son CLS leur somme.

### Baseline principale — trois passages bruts

| Parcours | Passage | LCP | INP | CLS | Requêtes totales | Applicatives |
|---|---:|---:|---:|---:|---:|---:|
| Client mobile | 1 | 416 ms | 48 ms | 0,003886 | 122 | 80 |
| Client mobile | 2 | 352 ms | 32 ms | 0,010764 | 104 | 62 |
| Client mobile | 3 | 328 ms | 32 ms | 0,010764 | 93 | 50 |
| Coach desktop | 1 | 276 ms | 24 ms | 0 | 107 | 40 |
| Coach desktop | 2 | 308 ms | 24 ms | 0 | 108 | 40 |
| Coach desktop | 3 | 224 ms | 24 ms | 0 | 107 | 40 |

### Agrégats

| Parcours | Mesure | Minimum | Médiane | Maximum |
|---|---|---:|---:|---:|
| Client mobile | LCP | 328 ms | 352 ms | 416 ms |
| Client mobile | INP | 32 ms | 32 ms | 48 ms |
| Client mobile | CLS | 0,003886 | 0,010764 | 0,010764 |
| Client mobile | Requêtes totales | 93 | 104 | 122 |
| Client mobile | Requêtes applicatives | 50 | 62 | 80 |
| Coach desktop | LCP | 224 ms | 276 ms | 308 ms |
| Coach desktop | INP | 24 ms | 24 ms | 24 ms |
| Coach desktop | CLS | 0 | 0 | 0 |
| Coach desktop | Requêtes totales | 107 | 107 | 108 |
| Coach desktop | Requêtes applicatives | 40 | 40 | 40 |

La première exécution confirme le protocole : client LCP médian 396 ms, INP
32 ms, CLS 0,010764, 110 requêtes totales et 68 applicatives; coach LCP 284 ms,
INP 24 ms, CLS 0, 105 requêtes totales et 40 applicatives. Les valeurs brutes
restent dans le premier artefact.

## Requêtes par catégorie

Valeurs `passage 1 / passage 2 / passage 3` de la baseline principale :

| Catégorie | Client mobile | Coach desktop |
|---|---:|---:|
| Auth | 3 / 3 / 3 | 5 / 6 / 6 |
| PostgREST | 72 / 54 / 42 | 27 / 26 / 26 |
| Realtime | 3 / 3 / 3 | 5 / 5 / 5 |
| Routes Next/API | 1 / 1 / 1 | 1 / 1 / 1 |
| Documents | 1 / 1 / 1 | 2 / 2 / 2 |
| JavaScript | 28 / 28 / 29 | 48 / 48 / 48 |
| CSS | 1 / 1 / 1 | 2 / 2 / 2 |
| Polices | 7 / 7 / 7 | 14 / 14 / 14 |
| Images/médias | 6 / 6 / 6 | 3 / 4 / 3 |
| Autre local | 0 / 0 / 0 | 0 / 0 / 0 |

Le total applicatif exclut JavaScript, CSS, polices et images/médias. Le détail
par étape est conservé dans les artefacts. Pour le second run :

- client Home `110/70`, `92/52`, `81/40`; Training `6/4` à chaque passage;
  Nutrition `6/6` à chaque passage (`total/applicatif`) ;
- coach Home `51/15`, `52/15`, `51/15`; Clients `2/1`, `1/0`, `2/1`;
  Messages `8/6`, `9/7`, `8/6`; détail client `46/18` à chaque passage.

## Limites et dettes observées

- Les mesures sont locales, sans latence Internet ni throttling CPU/réseau;
  elles servent de point de comparaison reproductible, pas de p75 terrain.
- Le dashboard client émet 42 à 72 requêtes PostgREST selon le passage. Cette
  variabilité est conservée et constitue une cible d'analyse.
- `/api/feedback/mine` répond 500 pendant les parcours synthétiques. La requête
  est comptée; son comportement n'est pas corrigé dans cette tranche.
- Le serveur journalise aussi l'avertissement Supabase historique sur
  `getSession()`. Il n'est pas masqué ni corrigé ici.
- Les chunks chargés dynamiquement pendant les interactions sont présents dans
  les mesures réseau. Le tableau bundle décrit les dépendances déclarées par
  les manifests de routes, sans les confondre avec les requêtes observées.

## Confidentialité et nettoyage

Les artefacts ne contiennent ni e-mail, UUID de fixture, token, cookie, clé,
URL distante ni contenu utilisateur. Les comptes et lignes synthétiques sont
supprimés et vérifiés après chaque exécution. Mailpit est vide, le port 3211 est
fermé et le répertoire de build temporaire est absent après chaque run.
