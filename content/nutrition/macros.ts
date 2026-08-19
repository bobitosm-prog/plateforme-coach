export type MacrosLink = {
  href: string
  label: string
  description: string
}

export type MacrosTable = {
  caption: string
  headers: readonly string[]
  rows: readonly (readonly string[])[]
}

export type MacrosSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  table?: MacrosTable
  contextualLink?: MacrosLink
}

export type MacrosContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly MacrosSection[]
  links: readonly MacrosLink[]
  disclaimer: string
}

export const MACROS_CONTENT: MacrosContent = {
  title: 'Macros : comprendre protéines, glucides et lipides',
  seoTitle: 'Macros : protéines, glucides et lipides | Guide MoovX',
  description: 'Comprenez le rôle des protéines, glucides et lipides, leur apport calorique et comment répartir vos macros selon votre objectif.',
  introduction: 'Les macronutriments regroupent les protéines, les glucides et les lipides. Ils fournissent de l’énergie et participent à différentes fonctions de l’organisme. Comprendre leur rôle aide à interpréter une répartition alimentaire sans la confondre avec une règle parfaite ou une prescription individuelle.',
  sections: [
    {
      id: 'definition',
      title: 'Que sont les macronutriments ?',
      paragraphs: [
        'Les macronutriments sont des nutriments consommés en quantités relativement importantes. Les protéines, les glucides et les lipides contribuent chacun à l’apport énergétique, mais ne remplissent pas les mêmes fonctions.',
        'Parler de macros permet de décrire leur place dans l’apport quotidien. Cette lecture complète, sans la remplacer, la qualité globale de l’alimentation : variété, fibres, micronutriments, hydratation et préférences restent également importantes.',
      ],
    },
    {
      id: 'proteines',
      title: 'Protéines : entretien et renouvellement des tissus',
      paragraphs: [
        'Les protéines fournissent des acides aminés utilisés notamment pour construire et renouveler les tissus. Leur place dépend du profil, de l’activité, de l’objectif et de l’alimentation dans son ensemble.',
        'Une cible protéique ne doit pas être isolée des calories, des glucides et des lipides. La page dédiée aux protéines quotidiennes approfondit les repères selon le contexte, tandis que cette page se concentre sur l’équilibre entre les trois macros.',
      ],
    },
    {
      id: 'glucides',
      title: 'Glucides : énergie disponible et adaptation au rythme de vie',
      paragraphs: [
        'Les glucides constituent une source d’énergie mobilisable par l’organisme. Leur quantité et leur répartition peuvent être adaptées à l’activité, aux séances, aux habitudes alimentaires et à la tolérance digestive.',
        'Réduire ou augmenter les glucides modifie la place disponible pour les autres macronutriments lorsque les calories restent identiques. Aucun niveau unique ne convient donc à tous les profils et à tous les objectifs.',
      ],
    },
    {
      id: 'lipides',
      title: 'Lipides : énergie et fonctions physiologiques',
      paragraphs: [
        'Les lipides participent notamment à la structure des membranes cellulaires et au transport de certaines vitamines. Ils sont aussi plus denses en énergie que les protéines et les glucides.',
        'Leur qualité et leur diversité comptent autant que leur quantité. Huiles, noix, graines, poissons gras et autres aliments peuvent s’intégrer selon les préférences et les besoins estimés.',
      ],
    },
    {
      id: 'calories-par-macro',
      title: 'Combien de calories apporte chaque macro ?',
      paragraphs: [
        'Les facteurs énergétiques usuels permettent de comprendre comment les grammes de macronutriments contribuent au total calorique. Ils servent à lire un résultat, pas à créer une nouvelle estimation personnalisée sur cette page.',
      ],
      table: {
        caption: 'Apport énergétique usuel des macronutriments',
        headers: ['Macronutriment', 'Énergie par gramme', 'Lecture pratique'],
        rows: [
          ['Protéines', 'Environ 4 kcal', 'Contribuent au total calorique et à l’apport en acides aminés'],
          ['Glucides', 'Environ 4 kcal', 'Contribuent au total calorique et à l’énergie disponible'],
          ['Lipides', 'Environ 9 kcal', 'Contribuent davantage au total calorique à quantité égale'],
        ],
      },
    },
    {
      id: 'repartition',
      title: 'Comment répartir ses macros',
      paragraphs: [
        'Une répartition commence par un repère calorique, puis organise la place des protéines, des lipides et des glucides. Elle doit rester compatible avec l’objectif, les préférences, l’activité, la faim et la digestion.',
        'Les pourcentages ne constituent pas une qualité en eux-mêmes. Deux répartitions différentes peuvent être cohérentes si elles couvrent les besoins estimés, soutiennent l’activité et restent applicables dans le quotidien.',
      ],
      points: [
        'Utiliser une estimation comme point de départ, pas comme mesure exacte.',
        'Éviter de modifier simultanément toutes les variables.',
        'Observer l’énergie, la satiété, la récupération et la régularité des repas.',
      ],
      contextualLink: {
        href: '/fr/nutrition/repas-sportifs',
        label: 'composer des repas sportifs à partir de ces repères',
        description: 'Passez de la répartition théorique à des structures de repas concrètes et adaptables.',
      },
    },
    {
      id: 'selon-objectif',
      title: 'Macros selon l’objectif : maintien, perte de poids et prise de masse',
      paragraphs: [
        'Au maintien, la répartition vise une organisation compatible avec une zone calorique globalement stable. En perte de poids, elle s’inscrit dans un déficit énergétique estimé tout en tenant compte de la satiété, de l’activité et de la récupération.',
        'En prise de masse, l’apport énergétique peut être ajusté progressivement selon le suivi. Les glucides peuvent soutenir l’entraînement, les protéines conservent leur place dans le renouvellement des tissus et les lipides restent intégrés à l’équilibre alimentaire.',
        'Ces orientations décrivent des contextes, pas des proportions universelles. La réponse observée et la capacité à maintenir l’organisation guident les ajustements.',
      ],
    },
    {
      id: 'calculateur-moovx',
      title: 'Comment utiliser le calculateur MoovX',
      paragraphs: [
        'Le calculateur MoovX utilise l’autorité nutritionnelle commune au produit pour estimer le métabolisme de repos, les calories de maintien, les calories liées à l’objectif et une répartition des macros selon les informations saisies.',
        'Cette page explique comment lire ces résultats ; elle ne réalise aucun second calcul. Utilisez le calculateur pour obtenir une estimation personnalisée, puis revenez aux rôles des macros pour comprendre la répartition proposée.',
      ],
    },
    {
      id: 'ajuster-suivi',
      title: 'Comment ajuster selon le suivi réel',
      paragraphs: [
        'Une estimation ne mesure pas directement les besoins réels. Suivre une tendance de poids, les performances, l’énergie, la faim et la récupération sur plusieurs semaines permet d’évaluer si l’organisation reste adaptée.',
        'Un ajustement progressif et isolé est plus facile à interpréter qu’une modification simultanée des calories, de l’entraînement et de tous les macronutriments. Les données observées complètent la formule initiale sans garantir un résultat particulier.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites et situations nécessitant un professionnel',
      paragraphs: [
        'Une répartition théorique ne décrit ni la qualité des aliments, ni la tolérance digestive, ni la manière dont les repas s’intègrent au quotidien. Elle reste un cadre de lecture à confronter à l’alimentation complète, aux sensations et aux tendances observées avant d’envisager un ajustement.',
        'Lorsqu’une maladie, une grossesse, l’allaitement, un traitement, des difficultés avec l’alimentation ou des symptômes digestifs influencent les choix nutritionnels, un professionnel qualifié peut évaluer le contexte et accompagner l’organisation des macronutriments.',
      ],
    },
  ],
  links: [
    { href: '/fr/outils/calculateur-calories-macros', label: 'Calculer mes calories et mes macros', description: 'Obtenir une estimation selon votre profil, votre activité et votre objectif.' },
    { href: '/fr/guides/nutrition', label: 'Guide de la nutrition sportive', description: 'Replacer les macros dans une organisation alimentaire complète.' },
    { href: '/fr/nutrition/proteines-par-jour', label: 'Combien de protéines par jour ?', description: 'Approfondir spécifiquement le besoin protéique quotidien.' },
    { href: '/fr/nutrition/prise-de-masse', label: 'Macros et prise de masse', description: 'Comprendre l’alimentation associée à un objectif de progression musculaire.' },
    { href: '/fr/nutrition/perte-de-poids', label: 'Macros et perte de poids', description: 'Comprendre déficit énergétique, satiété et suivi progressif.' },
  ],
  disclaimer: 'Ce contenu fournit des informations générales et aide à interpréter une estimation. Il ne constitue ni un diagnostic ni une prescription médicale ou diététique. En cas de pathologie, de grossesse, de traitement, de trouble du comportement alimentaire ou de besoin particulier, consultez un professionnel qualifié.',
}
