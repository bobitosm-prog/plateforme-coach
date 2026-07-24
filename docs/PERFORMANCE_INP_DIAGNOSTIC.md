# Diagnostic causal de l'INP froid client

> État au 24 juillet 2026 : diagnostic terminé, sans optimisation. Verdict
> unique : `environment_variance`, établi sur trois contrôles pré-déclarés.

## Protocole

La matrice a été exécutée avec un unique build Next.js production Webpack,
BUILD_ID `liZGGbdmUy5CIamKf7QPu`, Chromium 149, viewport 390×844 et services
locaux uniquement. Chaque expérience utilise un contexte neuf et les clics
Home → Training → Nutrition du protocole normatif. Les instruments sont actifs
uniquement avec les variables diagnostiques ; les captures normatives et leurs
budgets restent inchangés.

| Expérience | INP client | Clic Training | Lecture |
|---|---:|---:|---|
| A1 froid canonique | 48 ms | 48 ms | contrôle indépendant |
| A2 froid canonique | 32 ms | 32 ms | contrôle indépendant |
| A3 froid canonique | 48 ms | 48 ms | contrôle indépendant |
| B chunks préchargés | 32 ms | 32 ms | valeur déjà présente sans intervention en A2 |
| C onglet préchauffé | 32 ms | 32 ms | rendu/état chaud réduit la durée |
| D images bloquées | 48 ms | 48 ms | images non nécessaires à l'écart observé |
| E trace Playwright | 64 ms | 64 ms | instrumentation perturbatrice, non normative |

## Attribution mesurée

Le clic Training A1 se décompose en 1,7 ms d'attente d'entrée, 4,8 ms de
traitement et 41,5 ms d'attente de présentation. A2 descend à 32 ms sans
intervention, puis A3 revient à 48 ms. Aucun long task ni Long Animation Frame
ne chevauche l'interaction.

Deux chunks sont demandés à froid : `2661…js` (7 610 octets transférés) et
`5777…js` (54 869 octets). En B ils sont chargés et exécutés avant
l'interaction : aucune requête chunk ne chevauche alors le clic et celui-ci
mesure 32 ms. Cette valeur est toutefois identique au contrôle A2 sans
préchargement. En D aucune image secondaire n'est autorisée après Home et le
clic reste à 48 ms. C, qui a déjà rendu Training, mesure 32 ms.

Le seul verdict causal défendable est `environment_variance` : les trois
contrôles identiques ont une dispersion de 16 ms et recouvrent la valeur de B
et C. La variance se concentre dans la phase de présentation, pas dans l'attente
d'entrée ni le traitement. Les images ne sont pas une cause suffisante ; les
chunks restent corrélés au premier rendu mais leur préchargement ne peut pas
être déclaré causal puisque A2 atteint le même résultat sans intervention.
Les données ne permettent pas d'isoler sans instrumentation intrusive un
commit React, un calcul de style, un layout ou un paint précis :
`reactCommitsObservable=false` et `imageDecodeObservable=false`.

La variation `48/32/48` est conservée telle quelle. La trace E à 64 ms confirme
qu'une instrumentation plus lourde perturbe la mesure et ne peut servir de
référence normative.

## Artefact et reproductibilité

L'artefact expurgé est
`perf/diagnostics/phase-8-inp-causal-matrix.json`. Il contient le BUILD_ID,
les expériences, les timings, codes de ressources locaux et états
d'observabilité. Il ne contient ni cookie, token, e-mail, UUID utilisateur ni
contenu métier.

```bash
MOOVX_INP_CAUSAL_MATRIX_PATH=perf/diagnostics/phase-8-inp-causal-matrix.json \
  npm run perf:baseline -- --output /tmp/moovx-inp-diagnostic-control.json
```

Une reconstruction au commit historique n'a pas été lancée : ce commit ne
contient pas ce harnais d'attribution et le greffer sur un ancien build avec le
schéma local actuel introduirait un second protocole non comparable.

## Limites et suite

- Mesures locales sans throttling, sur un seul poste.
- PerformanceEventTiming arrondit les durées d'interaction par pas visibles de
  16 ms.
- La trace E est diagnostique et ne remplace jamais la mesure normative.
- Aucune optimisation applicative ou baseline n'est changée. La décision
  ultérieure calibre uniquement le garde-fou local INP client.

Deux captures normatives indépendantes ont ensuite été exécutées sans
instrumentation. La première passe 79/79 avec INP client `48/32/32`; la seconde
échoue initialement 78/79 avec `32/48/48`, confirmant la variance sous l'ancien
plafond médian. Aucun troisième essai n'est exécuté. La calibration acceptée
`53/36 → 64/48 ms` est versionnée dans le registre v2 ; les six artefacts
passent sans modification de leurs mesures.
