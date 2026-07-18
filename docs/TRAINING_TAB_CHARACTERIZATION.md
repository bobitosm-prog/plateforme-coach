# Caractérisation de `TrainingTab`

Cette tranche fige le comportement observable de `TrainingTab` avant son
découpage. Elle complète l'[inventaire des formats](TRAINING_FORMATS_INVENTORY.md),
le [modèle canonique](TRAINING_CANONICAL_MODEL.md) et les
[adaptateurs legacy](TRAINING_LEGACY_ADAPTERS.md), sans brancher ces derniers
dans l'interface.

## Frontière testée

La suite `tests/unit/training-tab-characterization.test.ts` rend le composant
réel avec React côté serveur. Supabase et les composants enfants lourds sont
remplacés uniquement à leurs frontières. Les props reçues par la carte héro,
les cartes d'exercice et la progression restent inspectables : la décision sur
le programme, l'état de séance et les prescriptions appartient donc toujours à
`TrainingTab`.

Les scénarios couvrent :

- l'absence de programme, la création de programme et la séance libre ;
- un programme coach assigné à un client `invited` ;
- les séries, répétitions et temps de repos transmis aux exercices ;
- l'action de démarrage avec les données du programme courant ;
- une séance du jour terminée ;
- un jour de repos ;
- un exercice legacy privé de champs optionnels, avec les valeurs par défaut
  actuelles ;
- la priorité du programme personnel actif sur le programme coach ;
- l'affichage de progression des programmes périodisés.

## Limites assumées

`TrainingTab` n'expose aucun état `loading` ou `error` explicite : ses huit
effets chargent directement programmes personnels, historique et catalogue.
Cette absence est un comportement actuel, pas une garantie cible.

Le dépôt possède React Testing Library et jsdom, mais `jsdom@29` ne démarre pas
sous le graphe ESM de Node 24 utilisé pendant cette tranche. Ajouter ou changer
une dépendance aurait élargi une tâche de caractérisation. Les transitions DOM
après effets — activation d'un programme personnel, modales, saisie de séries
et minuteur — sont donc protégées ici par les contrats statiques et les props
capturées, pas par une interaction navigateur complète.

Les accès Supabase directs, les formats `any`, le stockage local et les
responsabilités multiples restent volontairement inchangés. Ils seront traités
par les extractions suivantes, avec cette suite comme filet de non-régression.
