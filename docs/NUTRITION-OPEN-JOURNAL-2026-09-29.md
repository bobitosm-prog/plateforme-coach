# Nutrition : journal ouvert et ajout contextualisé

## Audit terrain

Le journal partageait son écran avec un éditeur permanent, un sélecteur de repas,
un calendrier dépliable et des libellés/macros répétés. Les tables existantes
`daily_food_logs` (date, meal_type, quantité et macros) et `saved_meals` (foods JSON)
restent les sources de vérité. Leurs migrations et politiques owner/coach ont été
examinées ; aucune migration ni nouvelle permission n'est nécessaire.

Home et Training utilisent des surfaces plates #1d1c19/#27251f, des accents or
#e6c364 et des cartes arrondies. TrainingSheet fournit fermeture, focus, Escape
et adaptation au viewport ; RailOverlay protège le rail mobile.

## Tâche et scope

Installer la variante 1 choisie : quatre repas ouverts, aliments/quantités/calories
visibles, résumé quotidien compact et saisie uniquement à la demande. Le + du
repas ouvre Aliment, Repas enregistré, Photo (selon droit IA) et Code-barres.
Le formulaire reçoit explicitement le repas, la date et la source sélectionnés.
Photo et scanner restent des brouillons avant confirmation, comme les autres
sources. Le stockage des brouillons et les IDs d'écriture restent inchangés.
Le plan et les outils conservent leur accès secondaire. Les macros détaillées
restent accessibles en touchant l'aliment pour modifier sa quantité.

## Validations 4/4 et livrable

1. Journal : rendu réel du composant NutritionTab, quatre repas ouverts, aucune
   saisie permanente, états erreur/vide distincts et date passée.
2. Ajout : quatre sources jusqu'à la confirmation, aucune écriture au choix de
   source, rafraîchissement du journal et conservation du repas/date.
3. Fiabilité : tests de brouillons existants, reprise des écritures incertaines,
   droits photo et retour du focus à la fermeture.
4. Qualité : TypeScript, suite Vitest, FR/EN/DE et inspection navigateur mobile
   sur fixture synthétique utilisant les vrais composants. Caméra matérielle et
   lecture réelle d'un code-barres nécessitent le contrôle final sur iPhone.

Livrable : commit UI/tests/docs cohérent, PR et déploiement après les contrôles.
Contraintes : préserver les patterns et la persistance ; aucune donnée réelle
créée pendant les tests, aucune nouvelle dépendance ni exposition de secret.

## Retour appareil et reprise réseau

Le 29 septembre, après déploiement de la PR 79, Marco confirme : « caméra et
scan opérationnel ». Ces deux contrôles matériels sont donc validés par retour
utilisateur pour le build 6 et cette interface. Aucun résultat de coupure réseau
sur iPhone n'est déduit de cette confirmation.

Le suivi ajoute un test runtime du composant NutritionTab complet : ajout d'un
repas enregistré au dîner, réponse perdue après écriture simulée, fermeture,
réouverture par le choix Code-barres, restauration de la tentative verrouillée,
puis retry avec les mêmes IDs. Le scanner ne remplace pas une tentative en
attente ; un seul aliment est conservé et le brouillon est retiré après succès.
Ce test complète l'intégration PostgreSQL existante sans remplacer le contrôle
radio sur appareil. Aucun changement produit ni donnée réelle.

### Contrôle réseau sur iPhone — retour du 29 septembre

Les captures utilisateur de 10:57:33 puis 10:58:19 montrent successivement
le mode avion, une sélection conservée avec erreur explicite, puis le retour du
réseau et une seule occurrence visible de l'aliment dans le petit-déjeuner.
Le total du repas correspond à la somme des deux lignes visibles. Le scénario
coupure avant confirmation puis retry est validé sur appareil pour ce test.
Cela ne constitue pas une vérification exhaustive des doublons en base ni un
test de perte de réponse après commit serveur (couvert séparément en local).

### Fiabilité du contrôle d'intégration

Deux exécutions CI ont échoué avant les tests sur le téléchargement PostgREST
(ECR public : `toomanyrequests`). Le runner utilise désormais la publication
GHCR officielle Supabase v14.14, figée par empreinte multi-architecture. Le pull
GHCR a retourné exactement la même empreinte que l'image ECR utilisée jusque-là.
La version et le contenu du service de test restent donc identiques.

Validation locale avant commit : runner complet exécuté avec la référence GHCR
figée, 32 tests d'intégration réussis, contrôles SQL et restauration de sauvegarde
synthétique réussis, nettoyage des conteneurs/volumes/réseau confirmé.

### Changement de compte sur iPhone — validé le 29 septembre

Marco confirme : « le test du changement de compte est validé ». Ce retour
valide le scénario demandé A → B → A : une tentative de repas conservée sur A
n'apparaît pas sur B, puis est retrouvée en revenant sur A, pour la même date
et le même repas. Validation sur appareil rapportée par l'utilisateur, en
complément des tests automatisés d'isolation des brouillons et du cache profil.
Le contrôle physique de ce scénario n'est donc plus en attente.
