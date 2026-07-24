# Baseline de performance

La réduction mesurée des frontières hydratées est décrite dans
[Frontières Client Components des routes critiques](./PERFORMANCE_CLIENT_BOUNDARIES.md).
Le diagnostic opt-in du dépassement INP froid est décrit dans
[Diagnostic causal de l'INP froid client](./PERFORMANCE_INP_DIAGNOSTIC.md) ;
il ne remplace aucun artefact normatif.

La tentative finale anti-cherry-picking est consignée dans
[Comparaison Core Web Vitals Phase 8](./PERFORMANCE_CWV_COMPARISON.md) :
validation 1 passe 79/79, validation 2 échoue 78/79. Les deux artefacts sont
conservés et aucune troisième capture n'est effectuée.

Le statut 78/79 de validation 2 reste l'historique sous les anciens plafonds
INP client `53/36 ms`. La calibration méthodologique v2 `64/48 ms`, détaillée
dans [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md), fait passer les six
artefacts existants 79/79 sans modifier leurs octets.

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
Les frontières de navigation retenues et leurs exclusions sont décrites dans
[États de chargement par segment](./PERFORMANCE_SEGMENT_LOADING.md).
La politique d’erreur publique et de reset est décrite dans
[Frontières d’erreur des domaines critiques](./PERFORMANCE_ERROR_BOUNDARIES.md).
Le découpage à la demande et sa preuve par chunks sont décrits dans
[Chargement différé des onglets et modales](./PERFORMANCE_LAZY_UI.md).
La mesure des chunks Recharts/XLSX et les limites QR/MediaPipe sont décrites
dans [Chargement différé des bibliothèques lourdes](./PERFORMANCE_HEAVY_LIBRARIES.md).
L’inventaire local, les doublons et le lot de livraison optimisé sont décrits
dans [Inventaire des médias runtime](./PERFORMANCE_MEDIA_INVENTORY.md).

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

## Contrôle vidéo différée du 24 juillet 2026

Le contrôle opt-in décrit dans
[Diffusion vidéo différée](./PERFORMANCE_VIDEO_DELIVERY.md) utilise le même
build Webpack hermétique. Il confirme, aux viewports 390×844 et 1024×768,
zéro requête vidéo avant ouverture, le poster et la vidéo uniquement à
l’ouverture, puis zéro requête après fermeture et à la réouverture dans le
même contexte. Le résultat initial est reproduit avec
`SrLPOoGmnP25bgwl4YVAc` puis
`VLEOjiNamO8KiuxqReFvB`. Les deux contrôles passent 78/79 : l’INP client
médian de 48 ms dépasse la limite historique de 36 ms. Les références
versionnées restent 79/79 et aucun seuil n’est modifié.

Le diagnostic suivant attribue le 48 ms à la navigation Training, sans
lecteur, poster, requête poster ni longue tâche. Sous le même build
`qbqpoF9UAbUO0cuXMncsp`, le contrôle normal et le blocage des seuls posters
donnent chacun `48/32/32 ms`; le cache posters préchauffé donne `32/32/32 ms`.
Les trois médianes valent 32 ms et zéro poster intervient dans le parcours.
Deux contrôles complets consécutifs passent ensuite 79/79 :
`_PpsGszLdiCClVl7EEBto` (`32/32/48 ms`) et
`yJ62kxdndNlRX2xppcZi3` (`32/32/32 ms`).

La preuve média séparée est ensuite répétée sous `Ky_94DxnOzVtoy8WaJzNX` et
`0RCJgkLlOyBcMr3tpQSzI` : 1/1 et 79/79 deux fois. Elle conserve zéro transfert
avant activation et après fermeture. Une seule des quatre réouvertures émet
une petite plage 206 de 13 261 octets ; aucune ne retransfère la vidéo complète.

Ce contrôle n’écrase ni ne redéfinit la baseline versionnée : il caractérise
un parcours média secondaire. Les diagnostics restent opt-in, expurgés et
temporaires. Aucun budget, baseline ou comportement applicatif n’est modifié.

Le [jalon stockage/CDN](./MEDIA_STORAGE_CDN_DEPLOYMENT.md) a ensuite migré
uniquement le canary approuvé et les 17 posters, avec fallback local. Un
contrôle production hermétique sous BUILD_ID `0bvylxtGKvQJvAuDb22Sr` passe
79/79 : il ne remplace ni la baseline versionnée ni ses budgets.

### Contrôle des polices locales — 24 juillet 2026

L'[optimisation des polices](./LOCAL_FONT_HOSTING.md) déduplique les sources et
retire uniquement Barlow Condensed 900 du preload Next, sans changer les six
faces réellement utilisées. Le parcours client passe de 7 à 6 requêtes font
par passage ; le parcours coach de 14 à 12, car il charge deux documents.

Avant, BUILD_ID `znYK5S5ARUJwBZqdMnTxf` :

- client LCP `384/344/372 ms`, CLS
  `0,003886/0,010764/0,010764`, INP `32/32/32 ms` ;
- coach LCP `236/272/232 ms`, CLS `0/0/0`, INP `24/24/16 ms`.

Contrôle final, BUILD_ID `SGy66Cn-3N8fWsyXWIQQ4` :

- client LCP `336/324/324 ms`, CLS
  `0,003886/0,010764/0,010764`, INP `32/32/32 ms` ;
- coach LCP `228/252/236 ms`, CLS `0/0/0`, INP `24/24/16 ms`.

Le bundle reste stable : client 1 929 798 octets bruts / 566 007 gzip et coach
1 950 787 / 574 235. Le contrôle final passe 79/79. Un contrôle intermédiaire
conserve honnêtement un LCP client froid à 464 ms, soit 6 ms au-dessus du
garde, tandis que ses deux autres passages valent 360/356 ms. Aucun seuil ou
artefact de baseline n'est modifié.

La preuve réseau bloque les service workers et toute origine externe. Login,
onboarding, landing, client et coach transfèrent six fontes locales pour
803 468 octets. Les guides autonomes transfèrent quatre fontes pour
392 492 octets ; les vitrines six pour 743 484 octets. Les requêtes
historiques vers `app.moovx.ch` sont bloquées et consignées ; aucune requête de
police externe n'est observée.

## Comparaison avant/après du 24 juillet 2026

La [comparaison Core Web Vitals Phase 8](./PERFORMANCE_CWV_COMPARISON.md)
relit les deux références immuables et les deux validations finales. Les
médianes LCP passent de 386 à 322 ms côté client et de 280 à 222 ms côté
coach. L'INP client passe de 32 à 40 ms ; le coach et les CLS restent stables.

Les captures initiales 78/79 et la validation 2 initialement 78/79 restent
conservées sous les anciens plafonds INP client `53/36 ms`. La calibration
locale v2 `64/48 ms` fait passer les six artefacts 79/79 sans modifier leurs
mesures. Le rapport final utilise les validations et reste byte-identique sur
deux générations.
