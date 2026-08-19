export type SportsMealsLink = {
  href: string
  label: string
  description: string
}

export type SportsMealExample = {
  meal: string
  composition: readonly string[]
  context: string
}

export type SportsMealsSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  examples?: readonly SportsMealExample[]
  contextualLink?: SportsMealsLink
}

export type SportsMealsContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly SportsMealsSection[]
  links: readonly SportsMealsLink[]
  disclaimer: string
}

export const SPORTS_MEALS_CONTENT: SportsMealsContent = {
  title: 'Repas sportifs : composer des repas adaptés à vos objectifs',
  seoTitle: 'Repas sportifs : idées et composition pour vos objectifs | MoovX',
  description: 'Découvrez comment composer des repas sportifs équilibrés, organiser protéines, glucides et lipides et adapter vos repas à vos calories et objectifs.',
  introduction: 'Un repas sportif n’est pas une recette obligatoire ni un menu réservé aux athlètes. C’est un repas organisé pour contribuer aux besoins énergétiques, à la récupération et au confort digestif, tout en restant compatible avec les préférences et le rythme de vie. Les exemples proposés ici illustrent des structures à adapter, sans fixer de portions universelles.',
  sections: [
    {
      id: 'repas-equilibre',
      title: 'Qu’est-ce qu’un repas sportif équilibré ?',
      paragraphs: [
        'Un repas cohérent réunit généralement une source de protéines, une source de glucides, des lipides en quantité adaptée et des aliments qui contribuent aux fibres et aux micronutriments. Sa composition précise dépend du reste de la journée, de l’activité et de la tolérance individuelle.',
        'Le caractère sportif vient surtout de son intégration dans une organisation globale : calories, macronutriments, hydratation, horaires des séances et récupération. Un aliment isolé ne détermine pas à lui seul la qualité du repas.',
      ],
    },
    {
      id: 'associer-macros',
      title: 'Comment associer protéines, glucides et lipides',
      paragraphs: [
        'Une source protéique peut être associée à un féculent ou un autre aliment glucidique, puis complétée par une source de lipides et un accompagnement varié. Cette structure aide à composer le repas sans transformer chaque assiette en calcul permanent.',
        'La place de chaque macronutriment dépend des calories estimées et de l’objectif. Les grammes et les portions doivent donc être ajustés à partir du profil et du suivi réel, plutôt que copiés depuis un exemple générique.',
      ],
      points: [
        'Choisir des aliments compatibles avec les préférences et la digestion.',
        'Adapter les portions au total quotidien plutôt qu’à une règle par repas.',
        'Conserver une variété suffisante sur l’ensemble de la semaine.',
      ],
    },
    {
      id: 'avant-entrainement',
      title: 'Repas avant entraînement',
      paragraphs: [
        'Avant une séance, un repas peut privilégier une source de glucides facile à intégrer et une source de protéines appréciée. La quantité de lipides et de fibres peut être modulée selon le délai avant l’effort et le confort digestif observé.',
        'Plus le repas est proche de la séance, plus une composition simple peut être pratique. Il n’existe toutefois pas un délai ni un menu unique : l’horaire, l’intensité, la faim et la tolérance orientent le choix.',
      ],
    },
    {
      id: 'apres-entrainement',
      title: 'Repas après entraînement',
      paragraphs: [
        'Après l’entraînement, un repas complet peut réunir protéines et glucides dans une organisation qui contribue aux apports de la journée. L’hydratation et la qualité du repas suivant comptent également dans la récupération.',
        'Il n’est pas nécessaire de rechercher une combinaison compliquée si un repas habituel est prévu. La priorité reste d’atteindre une organisation quotidienne cohérente et reproductible.',
      ],
    },
    {
      id: 'petit-dejeuner',
      title: 'Petit-déjeuner sportif',
      paragraphs: [
        'Le petit-déjeuner peut être salé, sucré ou mixte. Sa structure dépend de l’appétit au réveil, de l’horaire d’entraînement et des autres repas prévus.',
      ],
      examples: [
        {
          meal: 'Petit-déjeuner salé',
          composition: ['Œufs', 'Pain', 'Cottage cheese ou alternative adaptée', 'Fruit selon la préférence'],
          context: 'Une base modulable lorsque plusieurs textures et une source protéique sont appréciées le matin.',
        },
        {
          meal: 'Petit-déjeuner en bol',
          composition: ['Produit laitier ou alternative végétale', 'Flocons d’avoine', 'Fruit', 'Graines ou oléagineux selon les besoins'],
          context: 'Une composition simple dont les portions peuvent évoluer selon le total énergétique estimé.',
        },
      ],
    },
    {
      id: 'dejeuner-diner',
      title: 'Déjeuner et dîner',
      paragraphs: [
        'Pour un repas principal, partir de quatre éléments facilite l’organisation : une source protéique, un féculent, une source de lipides et un accompagnement alimentaire adapté. Les légumes, fruits ou autres aliments peuvent varier selon la saison et les préférences.',
        'Cette trame ne fixe pas les quantités. Une personne qui s’entraîne beaucoup, une personne en déficit énergétique et une personne au maintien peuvent utiliser des aliments proches avec des portions et une répartition différentes.',
      ],
      examples: [
        {
          meal: 'Repas principal',
          composition: ['Poisson, volaille, tofu, légumineuses ou autre source protéique', 'Riz, pommes de terre, pâtes ou autre féculent', 'Huile, avocat, graines ou autre source de lipides', 'Accompagnement varié selon les préférences'],
          context: 'Une structure à décliner sans imposer les mêmes aliments ni les mêmes portions.',
        },
      ],
    },
    {
      id: 'collations-shakes',
      title: 'Collations et shakes',
      paragraphs: [
        'Une collation est utile lorsqu’elle répond à une contrainte pratique, à la faim ou à un apport difficile à répartir dans les repas principaux. Elle n’est pas obligatoire si l’organisation quotidienne fonctionne sans elle.',
        'Un shake peut réunir du lait ou une boisson végétale, de la whey lorsqu’elle est adaptée, et des flocons d’avoine ou une autre source glucidique. Il complète une alimentation structurée ; il ne garantit pas une meilleure récupération et ne remplace pas systématiquement un repas.',
      ],
    },
    {
      id: 'selon-objectifs',
      title: 'Exemples de repas selon différents objectifs',
      paragraphs: [
        'Selon l’objectif, la structure des repas peut rester similaire tandis que les portions, la densité énergétique ou le nombre de collations évoluent. En prise de masse, un repas peut intégrer davantage d’énergie de manière progressive. En perte de poids, la composition peut privilégier une organisation rassasiante compatible avec le déficit estimé.',
        'Au maintien, l’enjeu est souvent de conserver une structure stable et suffisamment flexible. Dans tous les cas, un exemple reste pédagogique : seule l’observation du contexte réel permet d’évaluer si l’organisation convient.',
      ],
      contextualLink: {
        href: '/fr/nutrition/menu-prise-de-masse',
        label: 'organiser un exemple de menu pour la prise de masse',
        description: 'Décliner cette structure sur une journée complète orientée prise de masse.',
      },
    },
    {
      id: 'adapter-portions',
      title: 'Adapter les portions aux calories et macros',
      paragraphs: [
        'Les calories et les macros donnent un cadre quotidien, mais elles ne dictent pas une assiette identique à chaque repas. Le calculateur MoovX fournit une estimation de départ ; la page consacrée aux macros aide ensuite à comprendre la place des protéines, glucides et lipides.',
        'Pour ajuster une organisation, mieux vaut modifier progressivement une portion ou une collation et observer la tendance, plutôt que bouleverser simultanément tous les repas.',
      ],
    },
    {
      id: 'moovx',
      title: 'Comment MoovX peut aider à organiser les repas',
      paragraphs: [
        'Après connexion, MoovX peut proposer des plans de repas adaptés aux objectifs nutritionnels renseignés. Les calories et macros sont estimées selon le profil et les réglages de l’utilisateur, puis les préférences alimentaires et restrictions déclarées contribuent à orienter l’organisation proposée.',
        'Les plans couvrent plusieurs jours et peuvent être suivis dans l’application. Ils restent des suggestions à vérifier et à ajuster : les informations renseignées ne garantissent pas l’absence d’un allergène ni l’adéquation à une situation médicale.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites et situations nécessitant un professionnel',
      paragraphs: [
        'Des exemples de repas ne permettent pas d’évaluer les besoins cliniques, les interactions avec un traitement ou la sécurité d’une restriction. Une intolérance ressentie, une allergie connue ou un symptôme digestif demande davantage qu’une simple substitution dans un menu.',
        'En cas de pathologie, de grossesse, d’allaitement, de trouble du comportement alimentaire, de traitement ou de besoin spécifique, un professionnel qualifié peut évaluer la situation et proposer un accompagnement individualisé.',
      ],
    },
  ],
  links: [
    { href: '/fr/nutrition/macros', label: 'Comprendre les protéines, glucides et lipides', description: 'Relier la composition des repas à la répartition des macronutriments.' },
    { href: '/fr/nutrition/proteines-par-jour', label: 'Estimer ses protéines quotidiennes', description: 'Approfondir le besoin protéique et sa répartition sur la journée.' },
    { href: '/fr/outils/calculateur-calories-macros', label: 'Estimer ses calories et ses macros', description: 'Obtenir un point de départ selon le profil, l’activité et l’objectif.' },
    { href: '/fr/guides/nutrition', label: 'Consulter le guide de nutrition sportive', description: 'Replacer les repas dans une organisation alimentaire complète.' },
    { href: '/fr/nutrition/prise-de-masse', label: 'Organiser ses repas en prise de masse', description: 'Comprendre le surplus énergétique et le suivi progressif.' },
    { href: '/fr/nutrition/perte-de-poids', label: 'Organiser ses repas en perte de poids', description: 'Comprendre déficit énergétique, satiété et suivi.' },
  ],
  disclaimer: 'Ces exemples sont pédagogiques et ne constituent ni un plan alimentaire universel ni une prescription médicale ou diététique. Les portions et les aliments doivent être adaptés au profil, aux besoins estimés, aux préférences et à la situation de santé. En cas de besoin particulier, consultez un professionnel qualifié.',
}
