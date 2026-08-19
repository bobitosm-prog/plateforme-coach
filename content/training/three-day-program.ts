export type ThreeDayProgramLink = {
  href: string
  label: string
}

export type ThreeDayProgramExercise = {
  name: string
  sets: string
  repetitions: string
  rest: string
}

export type ThreeDayProgramSession = {
  name: string
  focus: string
  exercises: readonly ThreeDayProgramExercise[]
}

export type ThreeDayProgramSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  links?: readonly ThreeDayProgramLink[]
  sessions?: readonly ThreeDayProgramSession[]
}

export type ThreeDayProgramContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly ThreeDayProgramSection[]
  disclaimer: string
}

export const THREE_DAY_PROGRAM_CONTENT: ThreeDayProgramContent = {
  title: 'Programme musculation 3 jours : organiser sa semaine',
  seoTitle: 'Programme musculation 3 jours : exemple et organisation | MoovX',
  description: 'Découvrez comment organiser un programme de musculation sur 3 jours, répartir vos séances et adapter exercices, séries et récupération à votre niveau.',
  introduction: 'Trois séances par semaine permettent de répartir le travail sans multiplier les jours d’entraînement. Cette fréquence peut convenir à plusieurs niveaux si le volume, les exercices et les temps de récupération restent adaptés au planning, au matériel et à l’expérience de chacun.',
  sections: [
    {
      id: 'pourquoi-trois-jours',
      title: 'Pourquoi s’entraîner 3 jours par semaine',
      paragraphs: [
        'Un rythme de trois jours crée plusieurs occasions de travailler dans la semaine tout en laissant des jours sans musculation entre certaines séances. Il peut ainsi concilier régularité, récupération et contraintes personnelles.',
        'Cette fréquence ne garantit pas un résultat à elle seule. La qualité des séances, le volume total, la progression suivie et la capacité à maintenir le planning déterminent l’utilité réelle de l’organisation.',
      ],
      points: [
        'Répartir le travail plutôt que concentrer une séance très longue.',
        'Conserver des jours disponibles pour la récupération ou d’autres activités.',
        'Adapter la durée de chaque séance au temps réellement disponible.',
      ],
    },
    {
      id: 'repartir-seances',
      title: 'Comment répartir les séances',
      paragraphs: [
        'La répartition dépend des jours disponibles et des groupes musculaires sollicités. Un planning lundi-mercredi-vendredi offre un jour intermédiaire, mais mardi-jeudi-samedi ou une autre combinaison peuvent fonctionner de la même manière.',
        'Lorsque deux séances se suivent, leur contenu peut cibler des zones différentes afin de limiter le chevauchement de fatigue. L’objectif est de pouvoir réaliser chaque séance avec une exécution cohérente, pas de respecter des jours imposés.',
      ],
    },
    {
      id: 'full-body-ou-split',
      title: 'Full body ou split sur 3 jours',
      paragraphs: [
        'Un programme full body sollicite plusieurs grands groupes musculaires à chaque séance. Il facilite la répétition des mouvements, mais demande de maîtriser la durée et la fatigue globale.',
        'Un split répartit davantage les zones travaillées. Push-pull-legs, haut-bas-corps entier ou d’autres organisations peuvent être envisagées selon les priorités. Aucun découpage n’est universellement supérieur : il doit surtout couvrir le travail prévu et rester récupérable.',
      ],
      links: [
        { href: '/fr/guides/musculation', label: 'Comparer les principes de fréquence, volume et récupération' },
      ],
    },
    {
      id: 'exemple',
      title: 'Exemple pédagogique de programme 3 jours',
      paragraphs: [
        'Cet exemple hybride haut du corps, bas du corps et corps entier illustre une répartition possible. Il ne s’agit pas d’un programme universel : les exercices, le nombre de séries et les fourchettes de répétitions doivent être adaptés au niveau et au matériel.',
        'Des séries de préparation peuvent précéder les mouvements principaux. La charge choisie doit permettre de conserver une exécution contrôlée sur les répétitions prévues.',
      ],
      sessions: [
        {
          name: 'Jour 1 — Haut du corps',
          focus: 'Répartir poussées et tirages dans une séance dédiée',
          exercises: [
            { name: 'Développé horizontal avec barre, haltères ou machine', sets: '3 à 4', repetitions: '6 à 10', rest: '2 à 3 min' },
            { name: 'Tirage horizontal', sets: '3 à 4', repetitions: '8 à 12', rest: '90 à 150 s' },
            { name: 'Tirage vertical ou tractions assistées', sets: '3', repetitions: '8 à 12', rest: '90 à 150 s' },
            { name: 'Développé épaules', sets: '2 à 3', repetitions: '8 à 12', rest: '90 à 120 s' },
            { name: 'Travail des bras au choix', sets: '2', repetitions: '10 à 15', rest: '60 à 90 s' },
          ],
        },
        {
          name: 'Jour 2 — Bas du corps',
          focus: 'Associer dominante genoux, hanches et stabilité',
          exercises: [
            { name: 'Squat, hack squat ou presse à cuisses', sets: '3 à 4', repetitions: '6 à 10', rest: '2 à 3 min' },
            { name: 'Soulevé de terre roumain ou hip hinge guidé', sets: '3', repetitions: '8 à 12', rest: '2 min' },
            { name: 'Fente ou mouvement unilatéral', sets: '2 à 3', repetitions: '8 à 12 par côté', rest: '90 s' },
            { name: 'Leg curl', sets: '2 à 3', repetitions: '10 à 15', rest: '75 à 90 s' },
            { name: 'Gainage ou porté de charge', sets: '2 à 3', repetitions: 'Durée contrôlée', rest: '60 à 90 s' },
          ],
        },
        {
          name: 'Jour 3 — Corps entier',
          focus: 'Compléter la semaine sans répéter intégralement les deux premières séances',
          exercises: [
            { name: 'Presse ou variante de squat modérée', sets: '3', repetitions: '10 à 15', rest: '90 à 120 s' },
            { name: 'Développé incliné', sets: '3', repetitions: '8 à 12', rest: '90 à 120 s' },
            { name: 'Rowing avec appui', sets: '3', repetitions: '8 à 12', rest: '90 à 120 s' },
            { name: 'Hip thrust ou extension de hanches', sets: '3', repetitions: '10 à 15', rest: '90 s' },
            { name: 'Élévations latérales ou travail complémentaire', sets: '2 à 3', repetitions: '12 à 20', rest: '60 à 75 s' },
          ],
        },
      ],
    },
    {
      id: 'series-repetitions-repos',
      title: 'Séries, répétitions et repos',
      paragraphs: [
        'Les séries et répétitions doivent être lues à l’échelle de la semaine. Ajouter des exercices à chaque séance augmente rapidement le volume total et peut réduire la qualité des dernières séries.',
        'Les mouvements exigeants nécessitent généralement plus de repos que les exercices complémentaires. Le repère utile reste la capacité à reprendre avec une technique et un niveau d’effort cohérents avec le plan.',
      ],
      links: [
        { href: '/fr/blog/combien-de-series-par-semaine-prise-de-muscle', label: 'Comprendre le nombre de séries par groupe musculaire' },
      ],
    },
    {
      id: 'organisation-recuperation',
      title: 'Organisation de la semaine et récupération',
      paragraphs: [
        'L’espacement des séances doit tenir compte du sommeil, du stress, des autres sports et de la fatigue ressentie. Une semaine chargée peut justifier de déplacer une séance plutôt que de réduire systématiquement tous les repos.',
        'Observer la qualité d’exécution, les performances et les sensations sur plusieurs séances aide à distinguer une fatigue ponctuelle d’une organisation durablement trop exigeante.',
      ],
      links: [
        { href: '/fr/blog/frequence-entrainement-combien-de-fois-par-semaine', label: 'Choisir une fréquence compatible avec votre récupération' },
      ],
    },
    {
      id: 'progression',
      title: 'Comment progresser',
      paragraphs: [
        'La progression peut venir d’une répétition supplémentaire, d’une charge légèrement supérieure, d’une meilleure amplitude ou d’une exécution plus stable. Elle n’est pas nécessairement identique sur les trois séances.',
        'Noter les séries, répétitions, charges et sensations permet de comparer des séances équivalentes. Une suggestion de progression doit rester compatible avec la technique et la récupération du moment.',
      ],
    },
    {
      id: 'adapter',
      title: 'Adapter selon le matériel et le niveau',
      paragraphs: [
        'Chaque schéma de mouvement peut être réalisé avec différentes variantes : poids du corps, haltères, barre, poulie ou machine. Le choix dépend de l’accès au matériel et de la maîtrise technique.',
        'Une personne moins expérimentée peut réduire le nombre d’exercices et privilégier des variantes guidées. Une personne plus avancée peut ajuster le volume ou les priorités sans transformer automatiquement chaque séance en programme plus long.',
      ],
      links: [
        { href: '/fr/programmes/musculation/debutant', label: 'Consulter le programme dédié aux premières semaines' },
      ],
    },
    {
      id: 'personnalisation-moovx',
      title: 'Comment MoovX personnalise le programme',
      paragraphs: [
        'MoovX peut proposer un programme selon l’objectif, le niveau, le nombre de jours, la durée disponible et le matériel renseigné. La structure générée organise les exercices, séries, répétitions et temps de repos.',
        'Le suivi des séances permet ensuite de formuler des suggestions de progression. Ces suggestions restent à examiner selon les performances, la fatigue et les informations fournies.',
      ],
      links: [
        { href: '/fr/coach-sportif-ia', label: 'Découvrir comment MoovX construit un programme personnalisé' },
      ],
    },
  ],
  disclaimer: 'Cet exemple est pédagogique et ne constitue pas un programme universel. Il doit être adapté au niveau, au matériel, aux capacités et à la récupération de chacun. En cas de douleur, de blessure, de limitation ou de situation médicale particulière, demandez l’avis d’un professionnel qualifié.',
}
