# Chargement différé des bibliothèques lourdes

## Inventaire

| Famille | Version installée | Imports runtime observés | Besoin et frontière |
|---|---|---:|---|
| Recharts | `3.8.0` | 7 | graphiques Analytics, progression, nutrition et administration ; les vues parentes secondaires sont déjà chargées dynamiquement |
| MediaPipe Tasks Vision | `0.10.34` | 1 | alignement de deux photos de progression, uniquement après l’action « aligner » |
| html5-qrcode | `2.3.8` | 1 | scanner alimentaire, uniquement après montage du scanner |
| SheetJS XLSX | `0.18.5` | 2 | import/export de programmes et export progression, uniquement dans le gestionnaire déclenché |

Les sept consommateurs Recharts exhaustifs sont
`app/(dashboard)/page-desktop.tsx`,
`app/admin/_components/RevenueChart.tsx`,
`app/client/[id]/components/ClientProgress.tsx`,
`app/components/AnalyticsSection.tsx`,
`app/components/tabs/progression/ProgressWellnessSection.tsx`,
`app/components/ui/SizedChart.tsx` et
`app/nutrition/NutritionDashboard.tsx`. Aucun barrel ne réexporte ces paquets.
Les parents Progress client, progression détail client et Analytics coach sont
des frontières dynamiques existantes. Recharts reste synchrone à l’intérieur
de la vue réellement affichée afin de préserver axes, légendes, tooltips,
calculs, SSR et géométrie.

MediaPipe accède à WebAssembly, au DOM image/canvas et à deux ressources modèle
externes historiques. Le module `lib/photo-align.ts` n’est importé qu’au clic,
puis `@mediapipe/tasks-vision` est importé dynamiquement. Aucun accès caméra
n’est effectué par cette fonctionnalité. Le détecteur est fermé à la fermeture
ou au démontage ; une génération invalide les initialisations et résultats
tardifs, y compris sous Strict Mode.

`html5-qrcode` utilise caméra, DOM et vidéo. `BarcodeScanner` conserve
`facingMode: environment`, `fps: 10` et un cadre `280 × 150`. L’import est
effectué lors du montage du scanner, jamais depuis le chemin Nutrition initial.
Un compteur de génération et un verrou d’initialisation empêchent les setups
doubles et neutralisent une résolution tardive ; `stop()` est appelé au
nettoyage.

XLSX n’accède ni à la caméra ni au réseau mais utilise `FileReader` et le
téléchargement navigateur. `lib/program-excel.ts` importe désormais le paquet
dans l’action. Les feuilles `Programme`, `Jour N`, les sept jours du modèle,
les colonnes `Exercice, Sets, Reps, Repos, Tempo, Technique, Détails`, les noms
de fichiers et l’ordre sont inchangés. Les contrôleurs empêchent les doubles
clics et libèrent leurs verrous dans `finally`.

## Preuve Webpack production

Le runner canonique accepte
`MOOVX_HEAVY_UI_EVIDENCE_PATH=/tmp/evidence.json`. Après le scénario, mais
avant de supprimer le build, il mesure brut et gzip les chunks réellement
observés. Il bloque toute origine autre que localhost.

La preuve fonctionnelle utilise le `BUILD_ID` `JFSMGl2PZEJ9g2rC11VJw`.

| Action | Première utilisation | Réouverture | Brut | Gzip |
|---|---|---:|---:|---:|
| Progress → graphiques Recharts | `4987.775bb9556dd7acc3.js` | 0 chunk | 69 054 o | 18 459 o |
| Training → modèle XLSX | `2170a4aa.d28be3e2076c7818.js`, `8436.cab94b59cca0a8ff.js` | 0 chunk | 411 819 o | 139 745 o |
| QR | indisponible dans le navigateur hermétique sans caméra | — | — | — |
| MediaPipe | indisponible sans paire de photos stockées et sans autoriser ses modèles externes | — | — | — |

Les deux familles indisponibles sont couvertes par gardes statiques et tests de
cycle de vie ; aucune taille simulée n’est publiée.

## Contrôle de performance

Face au contrôle précédent `miv4lys-1k6ofBZT3gFNq`, les manifests initiaux
restent stables à quelques octets de runtime Webpack :

| Route | Avant brut / gzip | Après brut / gzip |
|---|---:|---:|
| `/` | 1 930 419 / 566 219 o | 1 930 422 / 566 246 o |
| `/coach` | 1 951 405 / 574 444 o | 1 951 408 / 574 471 o |
| `/client/[id]` | 1 996 459 / 584 999 o | 1 996 462 / 585 026 o |
| union dédupliquée | 2 017 445 / 593 224 o | 2 017 448 / 593 250 o |

La valeur de la tranche est le retrait des bibliothèques fonctionnelles des
chunks de leurs vues secondaires avant l’action, pas une baisse artificielle
des manifests initiaux.

L’attribution détaillée est activée uniquement avec
`MOOVX_PERFORMANCE_DIAGNOSTICS=1`. Elle conserve le calcul canonique mais
ajoute, sans donnée utilisateur, type et cible sémantique de l’interaction,
étape, état froid/chaud, chargement JavaScript dans l’étape, longues tâches et
élément LCP. Trois builds consécutifs sans changement de code
(`Dr7RYw_b6nuD0pHpa12qB`, `f9_wTo4o3jOWkYgKetXet`,
`wLNwtmugWf3hn-oWm6g5O`) passent chacun 79/79. L’INP client maximal est
toujours la navigation vers Training, sans longue tâche associée ; les valeurs
32/48 ms reflètent la quantification navigateur et non une action Recharts,
MediaPipe, QR ou XLSX. Le LCP coach isolé à 596 ms n’est pas reproduit :
les diagnostics observent 224–252 ms.

Après désactivation de cette attribution détaillée dans le protocole canonique,
deux contrôles neufs et consécutifs passent chacun 79/79, sans dépassement
informatif :

| Contrôle | BUILD_ID | Client LCP / INP / CLS médian | Coach LCP / INP / CLS médian |
|---|---|---:|---:|
| final 1 | `GbQqErj-h5pGl082idkqi` | 336 ms / 32 ms / 0,010764 | 236 ms / 24 ms / 0 |
| final 2 | `u5NKsNBOicU7ZubQzAQ9y` | 352 ms / 32 ms / 0,010764 | 244 ms / 24 ms / 0 |

Le premier contrôle final exécute ensuite, séparément, la preuve de chargement
lourd : elle passe 1/1 et ne participe pas aux mesures de la baseline.
Les budgets, les deux baselines versionnées et leurs seuils restent inchangés.

## Limites

- Le harnais ne fournit ni caméra physique ni paire de photos de progression.
- Les URL historiques wasm/modèle MediaPipe restent externes ; le protocole
  hermétique interdit donc leur activation.
- Les consommateurs Recharts hors des trois parcours de référence (admin,
  ancienne vue desktop et dashboard Nutrition autonome) restent séparés mais
  ne sont pas mesurés par ce parcours.
- Les avertissements Supabase et l’erreur historique `/api/feedback/mine`
  restent hors périmètre.
- L’INP client reste quantifié par pas de 16 ms sur la navigation Training ;
  l’attribution détaillée demeure disponible pour les futurs diagnostics mais
  est opt-in afin de ne pas ajouter d’observateurs au protocole canonique.
