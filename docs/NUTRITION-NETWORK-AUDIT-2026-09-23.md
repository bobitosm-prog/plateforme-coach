# Test d’interruption réseau — compositeur nutrition

> Mise à jour : le correctif décrit en fin de document remplace la limite
> reproduite pendant l’audit initial ci-dessous.

## Périmètre et méthode

Tests locaux jsdom du véritable MealComposer, avec le client de données simulé.
Aucune coupure du Mac, écriture de production ou connexion au compte utilisateur.
Le guide Supabase a orienté le contrôle des identifiants stables et l’absence
de modification des droits. Aucun changement SDK, schéma ou RLS.

## Résultats

| Scénario | Observation |
|---|---|
| Échec réseau avant confirmation | Erreur visible ; aliments/quantités conservés dans la fenêtre ; pas de succès annoncé |
| Nouvelle tentative dans la même fenêtre | Payload et identifiants identiques |
| Écriture acceptée puis réponse perdue | Une seule ligne dans le stockage simulé respectant la clé unique id et ignoreDuplicates |
| Double clic sur Réessayer | Une seule nouvelle tentative ; test existant confirmé |
| Enregistrement réussi mais rafraîchissement échoué | Pas de seconde insertion ; test existant confirmé |
| Fermeture du compositeur après erreur puis réouverture | Sélection perdue : limite reproduite, pas un comportement à conserver |

## Cause et risque non résolu

Les aliments sont dans useState et le payload soumis dans useRef uniquement.
L’identité idempotente survit aux retries du composant monté, pas à sa destruction.
Une fermeture volontaire après résultat incertain affiche un avertissement,
mais une fermeture de l’app ne peut pas compter sur cet avertissement.
Après une réponse perdue, recréer le même repas crée de nouveaux identifiants :
un doublon reste possible si le premier enregistrement avait réussi. Ce dernier
scénario est une déduction du code, pas une écriture testée en production.

## Correctif recommandé (non implémenté dans ce lot de test)

Persister le brouillon et les identifiants de soumission par propriétaire,
date et repas ; restaurer l’état incertain ; conserver exactement les mêmes
identifiants lors d’une reprise après redémarrage ; ne supprimer le brouillon
qu’après succès confirmé ou abandon explicite correctement expliqué. Définir
durée de conservation, confidentialité locale et comportement à la déconnexion.
Ne pas réécrire les repas existants ni introduire une nouvelle copie native.

## Limites des preuves

Le test Map simule l’unicité serveur ; ce n’est pas un test transactionnel sur
Postgres, ni un essai hors réseau dans WebKit iOS. La prévention des doublons
après fermeture n’est pas validée. Le test de caractérisation de perte devra
être remplacé par une attente de conservation lors du correctif.

## Correctif et nouvelle validation

Le brouillon versionné est désormais enregistré dans localStorage à chaque
modification acceptée, avec une clé propriétaire/date/type de repas. Les mêmes
UUID sont conservés après remontage du composant. Une soumission est marquée
durablement avant tout appel réseau, puis retirée après succès confirmé. Un
résultat incertain reste verrouillé et est conservé même après fermeture
volontaire. L’abandon explicite d’une sélection non soumise supprime uniquement
ce brouillon local. Un nouveau compte/contexte remonte un éditeur distinct.

Les lectures sont validées ; une erreur de stockage bloque l’envoi et affiche
un message. Les instantanés obsolètes ne peuvent ni remplacer ni effacer un
brouillon plus récent. Cette comparaison n’est pas une transaction distribuée
entre onglets : ne pas prétendre à une exclusion mutuelle absolue.

Conservation : aucun délai d’expiration automatique pour éviter de perdre une
tentative incertaine et ses UUID. Une clé par compte/date/repas, effacée après
succès ou abandon explicite avant soumission. Les aliments, quantités et valeurs
nutritionnelles restent sur cet appareil ; pas de photo, token ni secret dans
le brouillon. La déconnexion ne supprime pas le brouillon : seul son propriétaire
le retrouve dans l’interface. Ce n’est pas un chiffrement ni une protection
contre XSS ou une personne ayant accès aux données locales de l’appareil.

Reprise : ouvrir Nutrition, choisir la date d’origine, puis le même repas.
Pas de synchronisation inter-appareils ou de sauvegarde serveur ajoutée.
Effacer les données de l’app supprime toujours les brouillons. Une ancienne
version déjà ouverte n’a pas cette protection : recharger après déploiement.

2 059 tests locaux passent (225 fichiers). Le test de perte est remplacé par
une reprise avec payload identique ; le scénario réponse perdue puis remontage
conserve une seule ligne dans le serveur simulé. Autres cas : quota, saisie vide,
identifiants dupliqués, compte/date/repas distincts, écriture/suppression obsolète,
reprise après succès sans réapparition. TypeScript et traductions vérifiés.
La vérification WebKit iOS reste à effectuer manuellement ; aucune donnée réelle
n’a été modifiée. Aucun changement de schéma, RLS ou contrat de persistance.
