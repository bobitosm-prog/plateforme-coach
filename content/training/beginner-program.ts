export type BeginnerProgramLink = {
  href: string
  label: string
}

export type BeginnerProgramExercise = {
  name: string
  sets: string
  repetitions: string
  rest: string
}

export type BeginnerProgramSession = {
  name: string
  focus: string
  exercises: readonly BeginnerProgramExercise[]
}

export type BeginnerProgramSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  links?: readonly BeginnerProgramLink[]
  sessions?: readonly BeginnerProgramSession[]
}

export type BeginnerProgramContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly BeginnerProgramSection[]
  disclaimer: string
}

export const BEGINNER_PROGRAM_CONTENT: BeginnerProgramContent = {
  title: 'Programme musculation débutant : construire des bases solides',
  seoTitle: 'Programme musculation débutant : plan complet | MoovX',
  description: 'Découvrez comment structurer un programme de musculation débutant, organiser vos séances et progresser selon votre niveau, votre matériel et vos disponibilités.',
  introduction: 'Un programme débutant utile privilégie des mouvements accessibles, une charge maîtrisée et une organisation que vous pouvez répéter. L’exemple présenté ici sert de cadre pédagogique : les exercices, le volume et la fréquence doivent être adaptés au matériel, aux disponibilités et aux capacités de chaque personne.',
  sections: [
    {
      id: 'commencer',
      title: 'Comment commencer la musculation',
      paragraphs: [
        'Commencer consiste d’abord à apprendre quelques mouvements, à répéter une technique contrôlée et à construire une routine réaliste. Il n’est pas nécessaire de multiplier immédiatement les exercices ou les méthodes avancées.',
        'Choisissez des variantes compatibles avec votre mobilité et votre matériel. Une amplitude maîtrisée et une charge permettant de terminer les répétitions proprement constituent des repères plus utiles que la recherche immédiate de charges élevées.',
      ],
      points: [
        'Apprendre les réglages et les trajectoires des exercices.',
        'Noter les séries, répétitions et charges réalisées.',
        'Laisser une place suffisante à la récupération entre les séances.',
      ],
      links: [
        { href: '/fr/guides/musculation', label: 'Approfondir les bases avec le guide de musculation' },
      ],
    },
    {
      id: 'frequence',
      title: 'Combien de séances par semaine ?',
      paragraphs: [
        'Deux ou trois séances réparties dans la semaine peuvent offrir un cadre simple pour découvrir les mouvements et répéter régulièrement les principaux groupes musculaires. Le choix dépend surtout du temps disponible et de la récupération observée.',
        'Une fréquence plus élevée n’est utile que si elle reste compatible avec le sommeil, les contraintes personnelles et la qualité des séances. La régularité d’un planning réaliste compte davantage qu’un calendrier difficile à maintenir.',
      ],
      links: [
        { href: '/fr/blog/frequence-entrainement-combien-de-fois-par-semaine', label: 'Comprendre comment choisir sa fréquence d’entraînement' },
      ],
    },
    {
      id: 'structure',
      title: 'Structure d’un programme débutant',
      paragraphs: [
        'Une séance peut associer un mouvement pour les jambes, une poussée, un tirage, un travail de la chaîne postérieure et un exercice de stabilité. Cette structure limite la dispersion tout en couvrant les principaux schémas moteurs.',
        'L’ordre place généralement les mouvements les plus exigeants au début, lorsque l’attention et l’énergie sont disponibles. Des variantes plus simples ou guidées peuvent remplacer les exercices proposés selon le contexte.',
      ],
    },
    {
      id: 'exemple-trois-jours',
      title: 'Exemple pédagogique de programme 3 jours',
      paragraphs: [
        'Cet exemple illustre trois séances corps entier à espacer dans la semaine. Il ne constitue pas un programme universel : chaque exercice peut être remplacé par une variante adaptée au matériel, à la technique et aux contraintes individuelles.',
        'Les charges doivent permettre de conserver une exécution contrôlée. Une phase d’échauffement et des séries de préparation peuvent être ajoutées avant les mouvements principaux.',
      ],
      sessions: [
        {
          name: 'Séance A',
          focus: 'Découvrir les mouvements fondamentaux',
          exercises: [
            { name: 'Goblet squat ou presse à cuisses', sets: '3', repetitions: '8 à 12', rest: '90 à 120 s' },
            { name: 'Développé avec haltères ou pompes inclinées', sets: '3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Tirage horizontal assis', sets: '3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Soulevé de terre roumain léger', sets: '2', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Planche', sets: '2 à 3', repetitions: '20 à 40 s', rest: '60 s' },
          ],
        },
        {
          name: 'Séance B',
          focus: 'Varier les angles et consolider la technique',
          exercises: [
            { name: 'Fentes assistées ou split squat', sets: '3', repetitions: '8 à 10 par côté', rest: '90 s' },
            { name: 'Tirage vertical', sets: '3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Développé épaules assis', sets: '2 à 3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Hip thrust', sets: '3', repetitions: '10 à 12', rest: '90 s' },
            { name: 'Dead bug', sets: '2 à 3', repetitions: '6 à 10 par côté', rest: '60 s' },
          ],
        },
        {
          name: 'Séance C',
          focus: 'Répéter les schémas avec des variantes',
          exercises: [
            { name: 'Presse à cuisses ou squat sur banc', sets: '3', repetitions: '8 à 12', rest: '90 à 120 s' },
            { name: 'Développé incliné avec haltères', sets: '3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Rowing avec appui', sets: '3', repetitions: '8 à 12', rest: '90 s' },
            { name: 'Leg curl', sets: '2 à 3', repetitions: '10 à 15', rest: '75 s' },
            { name: 'Porté de charge ou gainage latéral', sets: '2 à 3', repetitions: '20 à 40 s', rest: '60 s' },
          ],
        },
      ],
    },
    {
      id: 'series-repetitions-repos',
      title: 'Séries, répétitions et repos',
      paragraphs: [
        'Les fourchettes de répétitions permettent d’ajuster la charge tout en gardant une technique stable. Lorsque toutes les séries atteignent le haut de la fourchette avec une exécution maîtrisée, une petite augmentation peut être envisagée lors d’une séance suivante.',
        'Le repos doit permettre de commencer la série suivante avec suffisamment de contrôle. Il peut être prolongé lorsque la respiration ou la technique ne sont pas encore revenues à un niveau satisfaisant.',
      ],
      links: [
        { href: '/fr/blog/combien-de-series-par-semaine-prise-de-muscle', label: 'Voir comment raisonner sur le nombre de séries' },
      ],
    },
    {
      id: 'progression',
      title: 'Comment progresser',
      paragraphs: [
        'La progression peut prendre plusieurs formes : mieux contrôler le mouvement, réaliser une répétition supplémentaire, augmenter légèrement la charge ou réduire une assistance. Un carnet d’entraînement aide à comparer les séances dans des conditions proches.',
        'MoovX permet de suivre les séries, répétitions et charges afin de formuler des suggestions de progression. Ces suggestions restent à examiner selon la fatigue, la technique et les sensations du moment.',
      ],
      points: [
        'Ne modifier qu’un paramètre principal à la fois.',
        'Conserver une charge lorsque la technique se dégrade.',
        'Prévoir une séance plus légère ou du repos lorsque la récupération est insuffisante.',
      ],
    },
    {
      id: 'erreurs-frequentes',
      title: 'Erreurs fréquentes',
      paragraphs: [
        'Les premières semaines servent à apprendre et à observer. Une organisation trop complexe rend plus difficile l’identification de ce qui aide réellement à progresser.',
      ],
      points: [
        'Changer de programme à chaque séance.',
        'Ajouter du volume sans tenir compte de la récupération.',
        'Utiliser une charge qui empêche de contrôler le mouvement.',
        'Ignorer les réglages du matériel ou les consignes de sécurité.',
        'Comparer directement ses charges à celles de pratiquants plus expérimentés.',
      ],
    },
    {
      id: 'personnalisation',
      title: 'Comment MoovX personnalise un programme',
      paragraphs: [
        'MoovX peut proposer une structure selon l’objectif, le niveau, les jours disponibles, la durée et le matériel renseignés. Le programme organise notamment les exercices, séries, répétitions et temps de repos.',
        'Le suivi permet ensuite de formuler des suggestions de progression. Certaines séances peuvent aussi être adaptées ponctuellement au temps disponible, sans supposer une modification continue et automatique du programme.',
      ],
      links: [
        { href: '/fr/coach-sportif-ia', label: 'Découvrir le fonctionnement du coach sportif IA MoovX' },
      ],
    },
  ],
  disclaimer: 'Ce programme est un exemple pédagogique général. Il doit être adapté au niveau, au matériel et aux capacités de chacun. En cas de douleur, de blessure, de limitation ou de situation médicale particulière, demandez l’avis d’un professionnel qualifié avant de poursuivre.',
}
