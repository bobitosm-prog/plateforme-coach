# Audit exercices, charges et volume — 22 septembre 2026

## Périmètre et preuves

Lecture du schéma et des 176 entrées du catalogue de production ; analyse du parcours de séance, de la persistance, des statistiques, de la comparaison historique et du suivi de progression. Aucune performance client modifiée pour les tests. Le test navigateur utilise une séance synthétique locale et un callback de sauvegarde sans base distante.

## Convention validée

| Situation | Saisie | Tonnage |
|---|---|---|
| Barre | Barre + tous les disques | poids × répétitions |
| Deux haltères | Poids d’un haltère ; répétitions avec les deux | poids × répétitions × 2 |
| Un haltère | Poids de l’unique haltère | poids × répétitions |
| Unilatéral, deux côtés saisis ensemble | Poids d’un haltère ; répétitions par côté | poids × répétitions × 2 |
| Machine | Charge indiquée | charge × répétitions |
| Poids du corps | Lest ajouté uniquement | lest × répétitions |
| Élastique ou exercice chronométré | Suivi séparé des séries/durée | Pas de tonnage comparable en kg |
| Historique sans convention | Valeur historique inchangée | Pas de multiplicateur rétroactif |

Le tonnage est une métrique comptable de charge externe, pas une mesure exacte du travail mécanique ni de la difficulté. Les machines à poulies, exercices au poids du corps et amplitudes différentes ne sont pas directement comparables. Les records estimés restent exprimés dans la convention de saisie, sans multiplier le 1RM par deux.

## Causes racines et corrections préparées

1. Aucune convention stockée sur une série : ajout de load_mode, transmission depuis le brouillon jusqu’à la base et calcul commun.
2. Les comparaisons de charges pouvaient mélanger poids total et poids par haltère : historique, courbes, records et suivi séparés par convention.
3. Les doublons provenaient d’identités définies par des noms libres : registre limité aux synonymes vérifiés et vue de sélection canonique. Les anciens identifiants et références ne sont pas supprimés.
4. Le rapprochement par préfixe et la suppression des parenthèses pouvaient confondre barre et haltères : rapprochement exact normalisé, alias explicites seulement.
5. Une vidéo d’un autre exercice du même groupe pouvait être affichée : ce remplacement automatique est supprimé.
6. Le remplacement d’un exercice déjà exécuté pouvait réétiqueter ses performances : blocage après la première série enregistrée. Ajouter un nouvel exercice reste possible.
7. Ajout manuel en séance : conservation de l’identifiant et du matériel, auparavant perdus.
8. Quatre erreurs de matériel : kickbacks machine/poulie vers machine ; mollets debout barre vers barre ; mollets debout poids du corps vers poids du corps.
9. Exclusion des séances explicitement incomplètes dans les volumes analytiques.
10. Convention verrouillée après première validation ; les paliers dégressifs et mini-séries conservent la convention.

## Doublons confirmés

Développé couché → développé couché barre ; curl barre droit → curl barre droite ; écarté couché haltères → écartés couchés haltères ; hip thrust → hip thrust barre ; squat / squat classique back squat → squat barre ; élévations frontales/latérales → variantes explicitement haltères ; leg curl couché → leg curl allongé ; extension jambes machine → leg extension ; leg press → presse à cuisses ; dips poitrine → dips pectoraux.

La migration ne relie que des entrées partagées, sans créateur, non personnalisées et avec matériel concordant. Aucune fusion de programmes, de séries réalisées ou de records historiques.

## Cas non fusionnés et dette à traiter

- Développé militaire générique/barre/debout : position insuffisamment décrite.
- Face pulls/face pulls corde ; rowing barre/rowing buste penché ; rowing haltère/rowing un bras ; triceps poulie corde : certaines descriptions manquent. Pas de fusion automatique.
- Soulevé de terre roumain et jambes tendues : ne pas les considérer comme des identités.
- Matériel historique à choix multiples (barre ou haltères, haltères ou poulie, etc.) : une catégorie unique ne suffit pas.
- Ab roller et battle ropes classés « band » : taxonomie à étendre ; ne pas les assimiler à des élastiques.
- Groupes de variantes adduction/abduction et reverse pec deck/écarté : curations nécessaires avant de s’en servir pour recommander un remplacement.
- Les éventuels paliers non enregistrés dans les anciennes séances ne peuvent pas être reconstruits.
- Politique INSERT du catalogue nommée « coaches can insert » : sa condition observée est seulement auth.uid() IS NOT NULL. Le durcissement des rôles demande un lot sécurité dédié avec audit des producteurs et tests d’autorisation.
- La présente lecture ne certifie pas individuellement la biomécanique de chaque description ni la pertinence de chaque vidéo.

## Validation locale

- Test navigateur réel : deux haltères 20 × 10 puis drop 15 × 8 = 640 kg, convention two_dumbbells sur les deux séries, parentSetNumber conservé, sélecteur verrouillé après validation.
- Tests unitaires dédiés : identité, parenthèses/matériel, multiplicateurs, historique, mini-séries, préremplissage.
- Migration exercée deux fois sur PostgreSQL jetable : identifiants conservés, exercices personnalisés non fusionnés, vue security_invoker respectant la RLS, quatre corrections matérielles.
- Records : ancien record conservé, nouvel enregistrement par convention indépendante, contrainte de valeurs autorisées.
- Déploiement distant : non effectué à la rédaction de ce rapport. Les validations de livraison finales doivent être ajoutées après leur exécution.

## Inventaire de production avant correction

Les colonnes ci-dessous sont des métadonnées de catalogue, sans données de performances clients.

| Exercice | Matériel actuel | Groupe de variantes |
|---|---|---|
| Ab Roller | band | ab_roller |
| Abduction Machine | machine_gym | abduction |
| Adduction Machine | machine_gym | abduction |
| Arnold press | dumbbell | dev_militaire |
| Barre au front | barbell | ext_triceps |
| Battle Ropes | band | cardio_epaules |
| Box Jump | bodyweight | cardio_quad |
| Burpees | bodyweight | cardio |
| Cable Crunch | machine_gym | crunch |
| Close Grip Bench Press | barbell | dev_serre |
| Crunch | bodyweight | crunch |
| Curl à la Machine | machine_gym | curl |
| Curl Barre Droit | barbell | curl |
| Curl barre droite | barbell | curl |
| Curl barre EZ | barbell | curl |
| Curl Concentré | dumbbell | curl |
| Curl haltères | dumbbell | curl |
| Curl Haltères Alterné | dumbbell | curl |
| Curl Haltères Simultané | dumbbell | curl |
| Curl Incliné | dumbbell | curl |
| Curl Marteau | dumbbell | curl_marteau |
| Curl Poulie Basse | machine_gym | curl |
| Curl pupitre | barbell | curl |
| Curl spider | barbell | curl |
| Développé assis haltères | dumbbell | dev_militaire |
| Développé Couché | barbell | dev_couche |
| Développé Couché Barre | barbell | dev_couche |
| Développé couché haltères | dumbbell | dev_couche |
| Développé couché machine | machine_gym | dev_couche |
| Développé couché prise serrée | barbell | dev_serre |
| Développé décliné barre | barbell | dev_decline |
| Développé décliné haltères | dumbbell | dev_decline |
| Développé Incliné Barre | barbell | dev_incline |
| Développé incliné haltères | dumbbell | dev_incline |
| Développé Militaire | barbell | dev_militaire |
| Développé Militaire Barre | barbell | dev_militaire |
| Développé militaire barre debout | barbell | dev_militaire |
| Dips | bodyweight | dips |
| Dips pectoraux | bodyweight | dips |
| Dips Poitrine | bodyweight | dips |
| Dips Triceps | bodyweight | dips |
| Donkey Calf Raise | machine_gym | mollet |
| Écarté Couché Haltères | dumbbell | ecarte |
| Écarté Poulie Basse | machine_gym | ecarte |
| Écarté Poulie Haute | machine_gym | ecarte |
| Écartés couchés haltères | dumbbell | ecarte |
| Écartés inclinés haltères | dumbbell | ecarte |
| Écartés poulie vis-à-vis basse | machine_gym | ecarte |
| Écartés poulie vis-à-vis haute | machine_gym | ecarte |
| Écartés poulie vis-à-vis moyenne | machine_gym | ecarte |
| Élévations Frontales | dumbbell | elev_front |
| Élévations frontales barre | barbell | elev_front |
| Élévations frontales disque | barbell | elev_front |
| Élévations frontales haltères | dumbbell | elev_front |
| Élévations frontales poulie | machine_gym | elev_front |
| Élévations Latérales | dumbbell | elev_lat |
| Élévations latérales haltères | dumbbell | elev_lat |
| Élévations latérales machine | machine_gym | elev_lat |
| Élévations latérales poulie basse | machine_gym | elev_lat |
| Elliptique | machine_gym | cardio |
| Extension Haltère Une Main | dumbbell | ext_triceps |
| Extension Jambes Machine | machine_gym | leg_ext |
| Extension nuque haltère | dumbbell | ext_triceps |
| Extension poulie corde | machine_gym | ext_triceps |
| Extension poulie haute | machine_gym | ext_triceps |
| Extension Triceps Machine | machine_gym | ext_triceps |
| Extension Triceps Poulie | machine_gym | ext_triceps |
| Extension Triceps Poulie Barre | machine_gym | ext_triceps |
| Extensions banc à lombaires | machine_gym | lombaires |
| Extensions mollets assis machine | machine_gym | mollet |
| Extensions mollets debout barre | machine_gym | mollet |
| Extensions mollets debout machine | machine_gym | mollet |
| Extensions mollets debout poids du corps | machine_gym | mollet |
| Face pull poulie corde | machine_gym | face_pull |
| Face Pulls | machine_gym | face_pull |
| Fente Bulgare | dumbbell | fente |
| Fentes | bodyweight | fente |
| Fentes arrière | bodyweight | fente |
| Fentes avant | bodyweight | fente |
| Fentes Bulgares | bodyweight | fente |
| Fentes croisées révérence | bodyweight | fente |
| Fentes Marchées | bodyweight | fente |
| French Press (Barre) | barbell | ext_triceps |
| Front squat | barbell | squat |
| Gainage Latéral | bodyweight | gainage |
| Glute Bridge | dumbbell | glute_bridge |
| Goblet squat | dumbbell | squat |
| Good morning | barbell | good_morning |
| Hack squat machine | machine_gym | squat |
| Hip Thrust | barbell | hip_thrust |
| Hip Thrust Barre | barbell | hip_thrust |
| Hip Thrust Machine | machine_gym | hip_thrust |
| Kettlebell Swing | kettlebell | swing |
| Kick Back Fessiers Poulie | machine_gym | kickback_fessiers |
| Kickback haltère triceps | dumbbell | ext_triceps |
| Kickbacks Câble | machine_gym | kickback_fessiers |
| Kickbacks machine | dumbbell | kickback_fessiers |
| Kickbacks poulie | dumbbell | kickback_fessiers |
| Leg curl allongé | machine_gym | leg_curl |
| Leg curl assis | machine_gym | leg_curl |
| Leg Curl Couché | machine_gym | leg_curl |
| Leg extension | machine_gym | leg_ext |
| Leg Press | machine_gym | presse |
| Leg Press Unilatéral | machine_gym | presse |
| Leg Raises Barres | bodyweight | leg_raise |
| Mollets Debout | machine_gym | mollet |
| Mollets Presse | machine_gym | presse |
| Mountain Climbers | bodyweight | leg_raise |
| Oiseau / Reverse Fly | machine_gym | oiseau |
| Oiseau banc incliné | dumbbell | oiseau |
| Oiseau haltères buste penché | dumbbell | oiseau |
| Pec Deck butterfly | machine_gym | ecarte |
| Planche | bodyweight | gainage |
| Planche Frontale | bodyweight | gainage |
| Pompes | bodyweight | pompes |
| Pompes claquées | bodyweight | pompes |
| Pompes déclinées | bodyweight | pompes |
| Pompes diamant | bodyweight | pompes |
| Pompes inclinées | bodyweight | pompes |
| Pont Fessier | bodyweight | glute_bridge |
| Presse à cuisses | machine_gym | presse |
| Pull-Over Haltère | dumbbell | pullover |
| Pull-over poulie haute bras tendus | machine_gym | pullover |
| Pull-up assisté machine | machine_gym | tirage |
| Relevé de Jambes | bodyweight | leg_raise |
| Reverse pec deck | machine_gym | ecarte |
| Romanian deadlift barre | barbell | stiff |
| Romanian deadlift haltères | dumbbell | stiff |
| Rowing assis poulie basse | machine_gym | rowing |
| Rowing Barre | barbell | rowing |
| Rowing barre buste penché | barbell | rowing |
| Rowing Ergomètre | machine_gym | rowing |
| Rowing Haltère | dumbbell | rowing |
| Rowing haltère un bras | dumbbell | rowing |
| Rowing Machine | machine_gym | rowing |
| Russian Twist | dumbbell | rotation |
| Seal row | machine_gym | rowing |
| Shrugs barre | barbell | shrugs |
| Shrugs haltères | dumbbell | shrugs |
| Soulevé de Terre | barbell | deadlift |
| Soulevé de terre jambes tendues | barbell | rdl |
| Soulevé de Terre Roumain | barbell | rdl |
| Soulevé de terre sumo | barbell | squat_sumo |
| Squat | barbell | squat |
| Squat Barre | barbell | squat |
| Squat bulgare | barbell | squat |
| Squat classique back squat | barbell | squat |
| Squat Goblet | dumbbell | squat |
| Squat Haltères | dumbbell | squat |
| Squat sumo barre | barbell | squat_sumo |
| Squat sumo haltère (goblet) | dumbbell | squat_sumo |
| Squat sumo kettlebell | kettlebell | squat_sumo |
| Squat sumo poids du corps | bodyweight | squat_sumo |
| Squat sumo smith machine | machine_gym | squat_sumo |
| Stiff leg deadlift barre | barbell | stiff |
| Stiff leg deadlift haltères | dumbbell | stiff |
| Stiff leg deadlift smith machine | machine_gym | stiff |
| Stiff leg deadlift unilatéral haltère | dumbbell | stiff |
| T-bar row | barbell | rowing |
| Tapis Roulant | machine_gym | cardio |
| Tirage menton prise large | barbell | upright_row |
| Tirage nuque poulie haute | machine_gym | tirage |
| Tirage poitrine poulie haute | machine_gym | traction |
| Tirage Poulie Haute Prise Large | machine_gym | tirage |
| Tirage Poulie Haute Prise Serrée | machine_gym | tirage |
| Tirage Vertical | machine_gym | tirage |
| Torsion Russe Lestée | dumbbell | rotation |
| Tractions | bodyweight | traction |
| Tractions Prise Large | bodyweight | traction |
| Tractions prise neutre | bodyweight | traction |
| Tractions pronation | bodyweight | traction |
| Tractions supination | bodyweight | traction |
| Triceps Poulie Corde | machine_gym | ext_triceps |
| Upright Row | barbell | upright_row |
| Vacuum Abdominal | bodyweight | gainage |
| Vélo Stationnaire | machine_gym | cardio_quad |

