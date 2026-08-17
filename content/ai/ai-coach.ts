export type AiCoachLink = {
  href: string
  label: string
  description: string
}

export type AiCoachSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
}

export type AiCoachContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly AiCoachSection[]
  links: readonly AiCoachLink[]
  disclaimer: string
}

export const AI_COACH_CONTENT: AiCoachContent = {
  title: 'Coach sportif IA : un programme adapté à votre profil',
  seoTitle: 'Coach sportif IA : programme fitness personnalisé | MoovX',
  description: 'Découvrez comment MoovX utilise l’IA pour créer un programme de fitness selon votre objectif, votre niveau, votre matériel et vos disponibilités.',
  introduction: 'Un coach sportif IA est un outil d’aide à la planification. MoovX utilise les informations que vous fournissez pour proposer une structure d’entraînement cohérente, faciliter le suivi et présenter des ajustements que vous restez libre de valider.',
  sections: [
    {
      id: 'definition',
      title: 'Qu’est-ce qu’un coach sportif IA ?',
      paragraphs: [
        'Un coach sportif IA transforme des informations déclarées par l’utilisateur en propositions structurées. Il peut aider à organiser les séances, expliquer des choix et suggérer des ajustements dans le cadre prévu par l’application.',
        'Ces propositions restent des outils d’aide. Leur pertinence dépend de la qualité des informations renseignées et du contexte individuel.',
      ],
    },
    {
      id: 'informations',
      title: 'Informations utilisées par MoovX',
      paragraphs: [
        'La personnalisation repose sur les informations fournies lors de la configuration du programme. MoovX les utilise pour cadrer la proposition sans supposer des données qui n’ont pas été communiquées.',
      ],
      points: [
        'L’objectif sportif sélectionné.',
        'Le niveau d’entraînement déclaré.',
        'Les disponibilités pour organiser la semaine.',
        'Le matériel accessible pour les séances.',
        'Les préférences indiquées par l’utilisateur.',
      ],
    },
    {
      id: 'creation',
      title: 'Création d’un entraînement adapté',
      paragraphs: [
        'À partir de ces paramètres, MoovX peut proposer un programme réparti sur les jours disponibles, avec une durée et une sélection d’exercices adaptées au contexte renseigné.',
        'La proposition fournit une base de travail structurée. Elle doit être relue et ajustée lorsque le matériel, les contraintes ou les capacités réelles diffèrent des informations initiales.',
      ],
    },
    {
      id: 'suivi',
      title: 'Suivi, diagnostic et ajustements contrôlés',
      paragraphs: [
        'Le suivi rassemble les séances enregistrées et les indicateurs disponibles afin de rendre la progression plus lisible. Lorsque suffisamment de données sont présentes, MoovX peut formuler des suggestions pour la semaine suivante.',
        'Les validations restent entre les mains de l’utilisateur. Les adaptations de séance sont ponctuelles et répondent à une contrainte explicite, par exemple le temps disponible. Une nouvelle génération de programme intervient après une décision, pas comme un changement permanent invisible.',
      ],
    },
    {
      id: 'nutrition',
      title: 'Nutrition associée',
      paragraphs: [
        'L’entraînement et la nutrition peuvent être suivis dans le même parcours. MoovX aide à estimer des repères de calories et de macros, puis à les relier à l’objectif déclaré.',
        'Ces repères sont des estimations informatives. Ils doivent être adaptés à la situation réelle et ne constituent pas une prescription médicale ou diététique.',
      ],
    },
    {
      id: 'comparaison',
      title: 'Différence avec un programme générique',
      paragraphs: [
        'Un programme générique propose la même structure indépendamment du contexte. MoovX construit sa proposition à partir de l’objectif, du niveau, des disponibilités, du matériel et des préférences renseignés.',
        'Cette contextualisation facilite la planification, sans supprimer la nécessité d’observer ses sensations, sa récupération et ses performances.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites de l’IA',
      paragraphs: [
        'Une réponse générée peut être incomplète ou inadaptée à une situation particulière. Elle doit être vérifiée avant application, notamment lorsque des douleurs, une pathologie, une grossesse, un traitement ou des besoins spécifiques sont concernés.',
        'MoovX ne fournit ni diagnostic ni traitement médical. En cas de doute, interrompez l’exercice concerné et consultez un professionnel qualifié.',
      ],
    },
    {
      id: 'creation-plan',
      title: 'Créer un plan MoovX',
      paragraphs: [
        'Renseignez votre objectif et vos contraintes pour obtenir une première proposition, puis utilisez le suivi pour décider des ajustements utiles au fil de votre pratique.',
      ],
    },
  ],
  links: [
    { href: '/fr/guides/musculation', label: 'Guide de la musculation', description: 'Comprendre exercices, volume, récupération et progression.' },
    { href: '/fr/guides/nutrition', label: 'Guide de la nutrition sportive', description: 'Approfondir calories, macros et organisation alimentaire.' },
    { href: '/fr/outils/calculateur-calories-macros', label: 'Calculateur de calories et macros', description: 'Estimer vos besoins selon votre profil et votre objectif.' },
    { href: '/fr/nutrition/prise-de-masse', label: 'Construire une prise de masse progressive', description: 'Relier alimentation, entraînement et suivi.' },
  ],
  disclaimer: 'Les propositions de MoovX sont informatives et reposent sur les données fournies. Elles nécessitent votre vérification et ne constituent ni un avis médical, ni un diagnostic, ni un traitement.',
}
