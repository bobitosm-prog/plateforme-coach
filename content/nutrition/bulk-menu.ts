export type BulkMenuLink = {
  href: string
  label: string
  description: string
}

export type BulkMenuExample = {
  label: string
  foods: readonly string[]
  note: string
}

export type BulkMenuSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  examples?: readonly BulkMenuExample[]
}

export type BulkMenuContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly BulkMenuSection[]
  links: readonly BulkMenuLink[]
  disclaimer: string
}

export const BULK_MENU_CONTENT: BulkMenuContent = {
  title: 'Menu prise de masse : organiser une journée alimentaire',
  seoTitle: 'Menu prise de masse : exemple de journée et repas | MoovX',
  description: 'Découvrez comment organiser un menu de prise de masse avec des exemples de repas, collations et alternatives à adapter à vos calories et préférences.',
  introduction: 'Un menu de prise de masse traduit un objectif énergétique en repas concrets répartis sur la journée. L’exemple présenté ici sert de trame pédagogique : les aliments, les portions et le nombre de prises doivent rester compatibles avec les calories estimées, l’appétit, les préférences et l’entraînement de chaque personne.',
  sections: [
    {
      id: 'construire-menu',
      title: 'Comment construire un menu de prise de masse',
      paragraphs: [
        'Commencez par une structure que vous pouvez répéter : repas principaux, éventuelle collation et aliments faciles à préparer. Le surplus énergétique relève de la stratégie globale ; le menu sert ensuite à répartir les apports sans transformer chaque journée en suite de recettes complexes.',
        'Une base pratique associe une source protéique, une source glucidique, des lipides et un accompagnement varié. Cette organisation peut être conservée tandis que les aliments et les portions évoluent selon le suivi.',
      ],
    },
    {
      id: 'repartir-apports',
      title: 'Répartir calories et protéines sur la journée',
      paragraphs: [
        'Les calories et les protéines estimées décrivent un total quotidien, pas une quantité identique à placer dans chaque repas. Les répartir entre plusieurs prises peut faciliter l’alimentation lorsque l’objectif augmente le volume à consommer.',
        'Le rythme dépend de l’appétit et des contraintes. Certaines personnes préfèrent trois repas plus consistants ; d’autres ajoutent une collation ou un shake pour compléter la journée sans imposer un modèle unique.',
      ],
    },
    {
      id: 'petit-dejeuner',
      title: 'Petit-déjeuner prise de masse',
      paragraphs: [
        'Le premier repas peut combiner protéines, glucides et aliments énergétiques dans un format compatible avec l’appétit du matin. Un petit-déjeuner liquide constitue une alternative pratique, mais il n’est pas obligatoire.',
      ],
      examples: [
        {
          label: 'Option à mâcher',
          foods: ['Œufs', 'Pain', 'Cottage cheese ou alternative', 'Fruit'],
          note: 'Une composition modulable dont les portions dépendent du reste de la journée.',
        },
        {
          label: 'Option liquide',
          foods: ['Lait ou boisson végétale', 'Flocons d’avoine', 'Fruit', 'Whey seulement lorsqu’elle est adaptée'],
          note: 'Une alternative pour les matins pressés ou lorsque l’appétit est faible.',
        },
      ],
    },
    {
      id: 'dejeuner',
      title: 'Déjeuner',
      paragraphs: [
        'Le déjeuner peut partir d’une source protéique, d’un féculent, d’une source de lipides et d’un accompagnement choisi selon les habitudes. Riz, pâtes, pommes de terre, céréales ou légumineuses offrent plusieurs façons d’intégrer les glucides.',
      ],
      examples: [
        {
          label: 'Structure de déjeuner',
          foods: ['Volaille, poisson, tofu, légumineuses ou autre protéine', 'Féculent apprécié', 'Huile, avocat, graines ou autre source de lipides', 'Accompagnement varié'],
          note: 'Les aliments peuvent être préparés à l’avance pour rendre le menu plus régulier.',
        },
      ],
    },
    {
      id: 'collation-shake',
      title: 'Collation ou shake',
      paragraphs: [
        'Une collation peut compléter les repas lorsque les apports sont difficiles à réunir autrement. Elle peut rester solide, prendre la forme d’un shake ou être supprimée si les repas principaux suffisent.',
      ],
      examples: [
        {
          label: 'Collation simple',
          foods: ['Produit laitier ou alternative', 'Source glucidique', 'Fruit ou autre option appréciée'],
          note: 'À choisir selon la faim, les préférences et le moment de la séance.',
        },
        {
          label: 'Shake sans whey',
          foods: ['Lait ou boisson végétale adaptée', 'Flocons ou autre source glucidique', 'Fruit selon préférence'],
          note: 'La whey reste facultative : le reste de l’alimentation détermine si un complément est utile.',
        },
      ],
    },
    {
      id: 'diner',
      title: 'Dîner',
      paragraphs: [
        'Le dîner peut reprendre la même logique que le déjeuner avec des aliments différents. Réutiliser une structure connue simplifie l’organisation tout en laissant varier les sources de protéines, de glucides et de lipides.',
      ],
      examples: [
        {
          label: 'Structure de dîner',
          foods: ['Source protéique', 'Féculent', 'Source de lipides', 'Accompagnement compatible avec les préférences'],
          note: 'La composition et la taille du repas peuvent tenir compte de l’horaire et du confort digestif.',
        },
      ],
    },
    {
      id: 'journee-complete',
      title: 'Exemple pédagogique de journée complète',
      paragraphs: [
        'Une journée peut enchaîner un petit-déjeuner avec œufs, pain, cottage cheese ou alternative et fruit ; un déjeuner structuré autour d’une protéine et d’un féculent ; une collation simple ou liquide ; puis un dîner construit sur la même trame que le déjeuner.',
        'Cet enchaînement illustre une organisation, pas un menu adapté à tous. Les quantités ne sont volontairement pas fixées : elles dépendent des objectifs nutritionnels configurés et des observations dans le temps.',
      ],
      points: [
        'Choisir des repas réalistes à préparer et à répéter.',
        'Conserver de la variété sur la semaine plutôt que tout changer chaque jour.',
        'Vérifier la digestion, l’appétit, la récupération et la tendance de poids.',
      ],
    },
    {
      id: 'variantes',
      title: 'Variantes selon les préférences alimentaires',
      paragraphs: [
        'Les variantes servent à adapter la forme du menu sans promettre une compatibilité médicale ou allergène. Sans produits laitiers, une alternative végétale dont la composition convient peut remplacer certains aliments. Sans whey, les repas et collations peuvent s’appuyer sur d’autres sources protéiques.',
        'Pour un repas rapide, privilégiez une structure courte avec des aliments disponibles. En cas de faible appétit, répartir davantage les prises ou choisir une option liquide peut être plus confortable, à condition que l’ensemble reste toléré.',
      ],
      points: [
        'Petit-déjeuner liquide lorsque mâcher est difficile le matin.',
        'Préparations simples ou assemblages rapides les jours chargés.',
        'Alternatives sans produits laitiers ou sans whey selon les préférences renseignées.',
      ],
    },
    {
      id: 'adapter-portions',
      title: 'Adapter les portions sans changer la structure',
      paragraphs: [
        'Une structure stable permet d’ajuster progressivement le menu. Modifier la portion d’un féculent, la densité d’une collation ou une source de lipides est plus facile à interpréter que remplacer tous les repas simultanément.',
        'Le calculateur fournit un repère de calories et de macros. La tendance observée, l’appétit et les performances aident ensuite à décider si les portions doivent évoluer, sans garantir une vitesse de prise de poids.',
      ],
    },
    {
      id: 'moovx',
      title: 'Utiliser MoovX pour personnaliser ses repas',
      paragraphs: [
        'Après connexion, MoovX peut proposer des plans de repas adaptés aux objectifs et préférences renseignés. Les quantités et apports sont ajustés selon les objectifs nutritionnels configurés dans l’application, puis le suivi permet de comparer l’organisation proposée aux observations réelles.',
        'Les plans couvrent plusieurs jours et restent des suggestions. Ils ne constituent ni un menu médical ni une garantie de prise de masse, et les restrictions déclarées ne garantissent pas l’absence d’un allergène.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites et situations nécessitant un professionnel',
      paragraphs: [
        'Un exemple de menu ne permet pas d’identifier un besoin clinique, une interaction avec un traitement ou la cause d’un inconfort digestif. Ajouter des aliments ou augmenter les portions n’est pas adapté à toutes les situations.',
        'Si votre santé, un traitement, une allergie ou une difficulté persistante à vous alimenter modifie les choix possibles, faites évaluer le menu par un professionnel qualifié. Cette prudence concerne aussi la grossesse, l’allaitement et les troubles du comportement alimentaire.',
      ],
    },
  ],
  links: [
    { href: '/fr/nutrition/prise-de-masse', label: 'Comprendre la stratégie de prise de masse', description: 'Revenir au surplus énergétique, au suivi et à la progression.' },
    { href: '/fr/nutrition/repas-sportifs', label: 'Composer des repas sportifs', description: 'Explorer des structures de repas applicables à différents objectifs.' },
    { href: '/fr/nutrition/proteines-par-jour', label: 'Organiser ses protéines quotidiennes', description: 'Approfondir le besoin protéique et sa répartition.' },
    { href: '/fr/nutrition/macros', label: 'Comprendre les macronutriments', description: 'Interpréter la place des protéines, glucides et lipides.' },
    { href: '/fr/outils/calculateur-calories-macros', label: 'Estimer ses calories et ses macros', description: 'Obtenir un point de départ selon le profil et l’objectif.' },
    { href: '/fr/guides/nutrition', label: 'Consulter le guide de nutrition sportive', description: 'Replacer le menu dans une organisation alimentaire globale.' },
  ],
  disclaimer: 'Cette trame illustre une façon d’organiser la journée, sans définir ce qu’une personne doit manger. Le choix des aliments et leur quantité dépend du contexte individuel. Une situation de santé ou un besoin clinique demande l’évaluation d’un professionnel qualifié.',
}
