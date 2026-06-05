export type Locale = 'fr' | 'en' | 'de'

export interface BlogReference {
  authors: string
  title: string
  journal: string
  year: number
  url: string
}

export interface BlogSection {
  heading: string
  paragraphs: string[]
}

export interface BlogContent {
  title: string
  description: string
  intro: string
  sections: BlogSection[]
  tableTitle?: string
  table?: { headers: string[]; rows: string[][] }
  ctaText: string
  disclaimer: string
}

export interface BlogPost {
  slug: string
  date: string
  image?: string
  readingMinutes: number
  references: BlogReference[]
  content: Record<Locale, BlogContent>
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'combien-de-proteines-prise-de-muscle',
    date: '2026-06-05',
    readingMinutes: 6,
    references: [
      {
        authors: 'Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, et al.',
        title: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
        journal: 'British Journal of Sports Medicine',
        year: 2018,
        url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
      },
      {
        authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
        title: 'International Society of Sports Nutrition Position Stand: protein and exercise',
        journal: 'Journal of the International Society of Sports Nutrition',
        year: 2017,
        url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
      },
    ],
    content: {
      fr: {
        title: 'Combien de protéines par jour pour prendre du muscle ? Ce que dit la science',
        description: "La science est claire sur l'apport en protéines pour la prise de muscle : environ 1,6 g/kg/jour. On vous explique les chiffres, les sources et comment les appliquer.",
        intro: "C'est probablement la question la plus posée en nutrition sportive : combien de grammes de protéines faut-il manger chaque jour pour construire du muscle efficacement ? Entre les conseils contradictoires des réseaux sociaux et les dosages parfois extrêmes prônés par certaines marques de compléments, il est facile de s'y perdre. Bonne nouvelle : la recherche scientifique a apporté des réponses claires grâce à des méta-analyses de grande envergure. Et c'est plus simple qu'il n'y paraît.",
        sections: [
          {
            heading: 'Le chiffre clé : 1,6 g par kilo',
            paragraphs: [
              "En 2018, une équipe de chercheurs menée par Morton et Schoenfeld a publié dans le British Journal of Sports Medicine la plus grande méta-analyse à ce jour sur le sujet : 49 études contrôlées, 1863 participants. Leur conclusion est nette : les gains de masse musculaire augmentent avec l'apport en protéines, mais plafonnent autour de 1,62 g par kilogramme de poids de corps par jour.",
              "Concrètement, au-delà de ce seuil, manger plus de protéines n'apporte pas de gain musculaire supplémentaire mesurable. C'est un résultat robuste, obtenu en agrégeant des données sur des populations variées (jeunes, seniors, hommes, femmes, débutants, entraînés).",
              "Pour une personne de 75 kg, cela représente environ 120 g de protéines par jour — l'équivalent de deux portions de poulet (200 g chacune) et un yaourt grec, ou une répartition sur 4 repas à ~30 g chacun.",
            ],
          },
          {
            heading: 'La fourchette officielle : 1,4 à 2,0 g/kg',
            paragraphs: [
              "La position officielle de l'International Society of Sports Nutrition (ISSN), publiée en 2017 par Jäger et collaborateurs, recommande un apport de 1,4 à 2,0 g de protéines par kg de poids de corps par jour pour la plupart des individus pratiquant la musculation ou un sport de résistance.",
              "Cette fourchette est volontairement large : elle tient compte des différences individuelles (niveau d'entraînement, masse musculaire, âge, objectifs). Un débutant peut tout à fait progresser avec 1,4 g/kg, tandis qu'un athlète expérimenté en phase de progression intensive pourra viser le haut de la fourchette.",
              "Le point essentiel : il n'est pas nécessaire de viser systématiquement le maximum. Se situer entre 1,4 et 1,8 g/kg suffit pour la grande majorité des sportifs, et la méta-analyse de Morton confirme que le bénéfice marginal au-delà de 1,6 g/kg est quasi nul.",
            ],
          },
          {
            heading: 'En période de sèche : monter les protéines',
            paragraphs: [
              "Quand on est en déficit calorique — c'est-à-dire qu'on mange moins que ce qu'on dépense pour perdre du gras — le corps a tendance à puiser dans ses réserves, y compris musculaires. Pour limiter cette perte de masse maigre, l'ISSN recommande de monter l'apport protéique entre 2,3 et 3,1 g/kg de masse maigre par jour.",
              "C'est nettement plus élevé que pour la prise de muscle, et c'est logique : les protéines jouent un rôle protecteur quand le corps est en restriction. Elles alimentent la synthèse protéique musculaire et augmentent la satiété, ce qui aide à respecter le déficit sans trop de faim.",
              "Pour notre personne de 75 kg en phase de sèche, cela monte à environ 170 à 230 g de protéines par jour. Un apport qui nécessite une planification nutritionnelle sérieuse — exactement le type de calcul que MoovX automatise pour vous.",
            ],
          },
          {
            heading: 'Comment répartir sur la journée',
            paragraphs: [
              "La quantité totale de protéines sur la journée est le facteur le plus important, mais la répartition joue aussi un rôle. La recherche montre que la synthèse protéique musculaire est optimisée quand les protéines sont distribuées de manière régulière sur la journée, plutôt que concentrées sur un ou deux gros repas.",
              "La recommandation pratique : viser environ 0,25 g/kg de poids de corps par prise (soit 20 à 40 g selon votre gabarit), répartis sur 3 à 5 repas espacés de 3 à 4 heures. Pour notre personne de 75 kg, cela revient à ~20 g de protéines 4 à 6 fois par jour.",
            ],
          },
        ],
        tableTitle: 'Vos besoins en protéines selon l\'objectif',
        table: {
          headers: ['Objectif', 'Apport recommandé', 'Exemple (75 kg)'],
          rows: [
            ['Entretien / prise de muscle', '1,6 g/kg/jour', '~120 g/jour'],
            ['Confort (fourchette ISSN)', '1,4 – 2,0 g/kg/jour', '105 – 150 g/jour'],
            ['Sèche / déficit calorique', '2,3 – 3,1 g/kg/jour', '170 – 230 g/jour'],
            ['Par repas', '0,25 g/kg (20–40 g)', '~20 g, 4x/jour'],
          ],
        },
        ctaText: "MoovX calcule automatiquement vos besoins en protéines selon votre poids, votre objectif et votre activité — et génère vos repas avec 170 aliments suisses. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif et ne remplace pas l'avis d'un professionnel de santé. Adaptez votre alimentation à votre situation personnelle, surtout en cas de pathologie.",
      },
      en: {
        title: 'How much protein per day to build muscle? What science says',
        description: 'Science is clear on protein intake for muscle gain: about 1.6 g/kg/day. We break down the numbers, sources, and how to apply them.',
        intro: 'Full English version coming soon.',
        sections: [],
        ctaText: 'MoovX automatically calculates your protein needs based on your weight, goals, and activity — and generates your meals from 170 Swiss foods. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only and does not replace professional medical advice.',
      },
      de: {
        title: 'Wie viel Protein pro Tag für Muskelaufbau? Was die Wissenschaft sagt',
        description: 'Die Wissenschaft ist klar: Etwa 1,6 g/kg/Tag für optimalen Muskelaufbau. Wir erklären die Zahlen, Quellen und praktische Umsetzung.',
        intro: 'Vollständige deutsche Version kommt bald.',
        sections: [],
        ctaText: 'MoovX berechnet automatisch deinen Proteinbedarf basierend auf Gewicht, Ziel und Aktivität — und erstellt deine Mahlzeiten aus 170 Schweizer Lebensmitteln. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken und ersetzt keine professionelle medizinische Beratung.',
      },
    },
  },
  {
    slug: 'combien-de-series-par-semaine-prise-de-muscle',
    date: '2026-06-05',
    readingMinutes: 6,
    references: [
      {
        authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
        title: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis',
        journal: 'Journal of Sports Sciences',
        year: 2017,
        url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
      },
      {
        authors: 'Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J',
        title: 'A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy',
        journal: 'Journal of Human Kinetics',
        year: 2022,
        url: 'https://pubmed.ncbi.nlm.nih.gov/35291645/',
      },
    ],
    content: {
      fr: {
        title: 'Combien de séries par semaine pour prendre du muscle ? Le volume optimal selon la science',
        description: "Le volume d'entraînement est le facteur clé de l'hypertrophie. La science recommande 10 à 20 séries par groupe musculaire par semaine. On vous explique.",
        intro: "Après la question des protéines, c'est sans doute la deuxième interrogation la plus fréquente en musculation : combien de séries faut-il faire par semaine pour chaque groupe musculaire ? Trop peu, on stagne. Trop, on se fatigue sans progresser. La recherche a beaucoup avancé ces dernières années sur cette question, et les réponses sont à la fois claires et nuancées.",
        sections: [
          {
            heading: "Le volume, facteur n°1 de l'hypertrophie",
            paragraphs: [
              "En 2017, Schoenfeld, Ogborn et Krieger ont publié dans le Journal of Sports Sciences une méta-analyse portant sur 15 études contrôlées. Leur objectif : quantifier la relation entre le volume d'entraînement hebdomadaire (nombre de séries par muscle) et la croissance musculaire. Le résultat est sans ambiguïté : il existe une relation dose-réponse significative. Plus on fait de séries pour un muscle donné, plus ce muscle grossit.",
              "Le seuil qui ressort de manière récurrente : 10 séries par muscle par semaine produisent des gains significativement supérieurs à moins de 5 séries. C'est le plancher à partir duquel la stimulation devient réellement productive pour la majorité des pratiquants.",
            ],
          },
          {
            heading: 'La fourchette pratique : 10 à 20 séries',
            paragraphs: [
              "Le consensus issu de l'ensemble de la littérature situe la zone efficace entre 10 et 20 séries par groupe musculaire par semaine. C'est la fourchette dans laquelle la plupart des individus obtiendront les meilleurs résultats, à condition que ces séries soient réparties sur au moins 2 séances (plutôt que concentrées en une seule).",
              "Pour un débutant, 10 séries par semaine et par muscle constituent un excellent point de départ. À mesure que le corps s'adapte et que la progression ralentit, augmenter progressivement vers 14, 16, voire 20 séries permet de relancer les gains. L'idée clé : le volume est un levier que l'on augmente graduellement, pas un maximum à atteindre dès le premier jour.",
            ],
          },
          {
            heading: 'Attention aux rendements décroissants',
            paragraphs: [
              "Plus n'est pas toujours mieux. Une revue systématique plus récente de Baz-Valle et collaborateurs, publiée en 2022 dans le Journal of Human Kinetics, a mis en évidence que les gains de masse musculaire plafonnent au-delà de 20 séries par semaine et par muscle. Pire : à très haut volume, la fatigue accumulée peut compromettre la qualité des séries suivantes et limiter la récupération.",
              "Le concept central est celui de volume PRODUCTIF : chaque série supplémentaire doit apporter un stimulus suffisant pour justifier le coût en fatigue. Une fois ce rapport renversé, ajouter du volume devient contre-productif. C'est pourquoi les programmes bien conçus modulent le volume par phases (périodisation), plutôt que de maintenir un volume maximal en permanence.",
            ],
          },
          {
            heading: 'Ce qui compte vraiment dans une série',
            paragraphs: [
              "Toutes les séries ne se valent pas. Pour qu'une série compte dans le total de volume productif, elle doit être menée suffisamment proche de l'échec musculaire — idéalement entre 0 et 4 répétitions en réserve (RIR). La charge utilisée doit permettre entre 6 et 30 répétitions : en dessous, c'est trop lourd pour cibler l'hypertrophie ; au-dessus, l'intensité est insuffisante.",
              "Les séries d'échauffement, les séries trop légères ou celles arrêtées bien avant l'effort ne comptent pas dans le volume hebdomadaire. C'est la qualité de l'effort, combinée à la quantité, qui détermine la croissance musculaire.",
            ],
          },
        ],
        tableTitle: 'Repères de volume hebdomadaire par muscle',
        table: {
          headers: ['Niveau', 'Séries / muscle / semaine', 'Répartition conseillée'],
          rows: [
            ['Débutant', '10 séries', '2 séances de 5 séries'],
            ['Intermédiaire', '12 – 16 séries', '2 à 3 séances'],
            ['Avancé', '16 – 20 séries', '3 séances ou plus'],
            ['Zone de plafonnement', '> 20 séries', 'Rendements décroissants'],
          ],
        },
        ctaText: "MoovX construit votre programme avec le bon volume par groupe musculaire selon votre niveau, et l'ajuste à mesure que vous progressez. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif et ne remplace pas l'accompagnement d'un professionnel. Adaptez le volume à votre récupération et votre expérience.",
      },
      en: {
        title: 'How many sets per week to build muscle? The optimal volume according to science',
        description: 'Training volume is the key driver of hypertrophy. Science recommends 10 to 20 sets per muscle group per week. Here is the breakdown.',
        intro: 'Full English version coming soon.',
        sections: [],
        ctaText: 'MoovX builds your program with the right volume per muscle group based on your level, and adjusts as you progress. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only and does not replace professional guidance.',
      },
      de: {
        title: 'Wie viele Sätze pro Woche für Muskelaufbau? Das optimale Volumen laut Wissenschaft',
        description: 'Das Trainingsvolumen ist der Schlüsselfaktor für Hypertrophie. Die Wissenschaft empfiehlt 10 bis 20 Sätze pro Muskelgruppe pro Woche.',
        intro: 'Vollständige deutsche Version kommt bald.',
        sections: [],
        ctaText: 'MoovX erstellt dein Programm mit dem richtigen Volumen pro Muskelgruppe basierend auf deinem Level und passt es laufend an. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken und ersetzt keine professionelle Beratung.',
      },
    },
  },
  {
    slug: 'frequence-entrainement-combien-de-fois-par-semaine',
    date: '2026-06-05',
    readingMinutes: 5,
    references: [
      {
        authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
        title: 'Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis',
        journal: 'Sports Medicine',
        year: 2016,
        url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/',
      },
      {
        authors: 'Schoenfeld BJ, Grgic J, Krieger JW',
        title: 'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency',
        journal: 'Journal of Sports Sciences',
        year: 2019,
        url: 'https://pubmed.ncbi.nlm.nih.gov/30558493/',
      },
    ],
    content: {
      fr: {
        title: "À quelle fréquence s'entraîner par semaine pour prendre du muscle ?",
        description: "1, 2 ou 3 fois par muscle par semaine ? La science est claire : à volume égal, c'est le volume total qui compte. On vous explique comment bien répartir.",
        intro: "Faut-il entraîner chaque muscle une, deux ou trois fois par semaine pour maximiser la croissance ? C'est l'un des débats les plus anciens de la musculation. Bonne nouvelle : la recherche a considérablement évolué ces dernières années, et la réponse est plus libératrice qu'on ne le pense. Vous avez plus de souplesse que vous ne croyez.",
        sections: [
          {
            heading: "2 fois par semaine bat 1 fois… au départ",
            paragraphs: [
              "En 2016, Schoenfeld, Ogborn et Krieger ont publié dans Sports Medicine une méta-analyse rassemblant les études comparant différentes fréquences d'entraînement. Leur conclusion a marqué les esprits : entraîner un muscle 2 fois par semaine produisait des gains de masse musculaire supérieurs à une seule fois par semaine.",
              "Ce résultat a largement contribué à populariser les programmes de type Upper/Lower ou PPL (Push/Pull/Legs), qui exposent chaque muscle à 2 stimulations hebdomadaires. Et pour cause : à l'époque, l'explication semblait logique — plus de fréquence, plus de synthèse protéique, plus de muscle.",
            ],
          },
          {
            heading: "La nuance clé : c'est le volume qui compte",
            paragraphs: [
              "Trois ans plus tard, Schoenfeld, Grgic et Krieger ont affiné leur analyse avec une étude plus large (25 études, publiée en 2019 dans le Journal of Sports Sciences). La conclusion cette fois est plus nuancée et plus importante : à VOLUME ÉGAL, la fréquence d'entraînement n'a pas d'impact significatif sur l'hypertrophie.",
              "Autrement dit, si vous faites 12 séries par semaine pour les pectoraux, les répartir en 1, 2 ou 3 séances donne des résultats comparables — à condition que chaque série soit effectuée avec une intensité suffisante. La fréquence n'est pas un facteur de croissance en soi ; c'est avant tout un outil d'organisation du volume.",
            ],
          },
          {
            heading: 'Pourquoi répartir reste utile en pratique',
            paragraphs: [
              "Si la fréquence n'est pas biologiquement supérieure, elle offre des avantages pratiques importants. Répartir 16 séries de pectoraux sur 2 séances (8 chacune) plutôt qu'une seule permet de mieux performer sur chaque série : moins de fatigue accumulée en cours de séance, meilleure qualité technique, charges plus lourdes maintenues.",
              "C'est aussi une question de récupération et de durée de séance. Une séance de 45 minutes bien ciblée est plus facile à caser dans un emploi du temps qu'une session marathon de 2 heures. La fréquence est donc un levier de régularité — et la régularité est le vrai moteur de la progression à long terme.",
            ],
          },
          {
            heading: 'Que retenir concrètement',
            paragraphs: [
              "Choisissez la fréquence qui vous permet de tenir votre volume hebdomadaire cible et de rester régulier. Si vous pouvez vous entraîner 6 jours par semaine, un PPL entraîne chaque muscle 2 fois — c'est un excellent compromis entre volume et récupération. Si vous n'avez que 3 jours, des séances Full Body bien construites peuvent donner des résultats tout aussi bons.",
              "Le message de la science est libérateur : il n'existe pas de fréquence magique. Ce qui compte, c'est de cumuler suffisamment de séries productives sur la semaine, et de le faire de manière soutenable. Le reste est une question de préférence et de planning.",
            ],
          },
        ],
        tableTitle: "Fréquence selon votre organisation",
        table: {
          headers: ['Fréquence / muscle', 'Pour qui', 'Remarque'],
          rows: [
            ['1x / semaine', 'Emploi du temps serré', 'OK si le volume total est atteint'],
            ['2x / semaine', 'La plupart des pratiquants', 'Bon compromis (ex : PPL 6 jours)'],
            ['3x / semaine', 'Avancés, volume élevé', 'Mieux répartir un gros volume'],
          ],
        },
        ctaText: "Le programme PPL de MoovX répartit automatiquement votre volume sur la semaine pour un équilibre optimal entraînement/récupération. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif. Adaptez votre fréquence à votre récupération, votre sommeil et votre niveau de stress.",
      },
      en: {
        title: 'How often should you train per week to build muscle?',
        description: '1, 2 or 3 times per muscle per week? Science is clear: at equal volume, total volume is what matters. Here is how to split it.',
        intro: 'Full English version coming soon.',
        sections: [],
        ctaText: "MoovX's PPL program automatically distributes your volume across the week for optimal training/recovery balance. 10-day free trial.",
        disclaimer: 'This article is for informational purposes only. Adjust frequency to your recovery, sleep, and stress level.',
      },
      de: {
        title: 'Wie oft pro Woche trainieren für Muskelaufbau?',
        description: '1, 2 oder 3 Mal pro Muskel pro Woche? Die Wissenschaft ist klar: Bei gleichem Volumen zählt das Gesamtvolumen. So teilst du es richtig auf.',
        intro: 'Vollständige deutsche Version kommt bald.',
        sections: [],
        ctaText: 'Das PPL-Programm von MoovX verteilt dein Volumen automatisch über die Woche für ein optimales Training-/Erholungsgleichgewicht. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken. Passe die Frequenz an deine Erholung, deinen Schlaf und dein Stressniveau an.',
      },
    },
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date))
}
