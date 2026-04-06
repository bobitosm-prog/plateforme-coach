export function getPrefatigueInstructions(): string {
  return `
METHODE PRE-FATIGUE OBLIGATOIRE :
Pour chaque groupe musculaire, structure TOUJOURS les exercices dans cet ordre :
1. D'abord un exercice d'ISOLATION (pre-fatigue)
2. Puis les exercices COMPOSES (polyarticulaires)

Mapping par groupe :
PECS : Isolation (1er) = Pec deck, Ecarte poulie, Ecarte halteres → Composes = Developpe couche, Developpe incline, Dips
FESSIERS : Isolation = Kickback poulie, Abduction machine → Composes = Hip thrust, Squat bulgare, Fente
QUADRICEPS : Isolation = Leg extension → Composes = Squat, Presse, Hack squat
ISCHIO-JAMBIERS : Isolation = Leg curl → Composes = Romanian deadlift, Good morning
EPAULES : Isolation = Elevation laterale → Composes = Developpe militaire, Arnold press
DOS : Isolation = Pullover, Tirage bras tendus → Composes = Rowing, Traction, Tirage poitrine
BICEPS : Isolation = Curl concentre, Curl pupitre → Composes = Curl barre, Curl halteres
TRICEPS : Isolation = Extension poulie → Composes = Dips, Barre au front

IMPORTANT : Ne commence JAMAIS un groupe musculaire par un exercice compose. L'isolation en premier pre-fatigue le muscle cible.
`
}
