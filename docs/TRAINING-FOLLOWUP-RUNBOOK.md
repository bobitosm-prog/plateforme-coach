# Suivi d’entraînement optionnel — 21 septembre 2026

## Décisions produit validées

- « FS7 » signifie FST-7.
- Le renouvellement mensuel est une proposition à valider, jamais un remplacement automatique.
- Trois préférences distinctes, désactivées par défaut : suivi adaptatif, revue mensuelle, techniques avancées.
- Le journal et l’historique restent accessibles lorsque le suivi est désactivé.

## Parcours livré

1. Profil → Préférences : activer le suivi et les options souhaitées.
2. Entraînement : consulter les tendances descriptives. Quatre séances standard comparables sont nécessaires pour caractériser une stabilité ; ce n’est pas un diagnostic médical ou une preuve de stagnation.
3. Après un mois calendaire, demander une proposition. La génération conserve le nombre de séances et les contraintes déclarées ; elle est déclenchée par le client, pas par un nouveau cron.
4. Examiner les séances avant de valider. Une proposition ne modifie pas le programme actif. Refus, expiration ou changement du profil/programme empêchent son application.
5. La validation est transactionnelle, répétable sans doublon et conserve les séances déjà enregistrées. Un programme de coach ne peut pas être remplacé par ce parcours.

Les alternatives sont filtrées par groupe musculaire et matériel dans le catalogue. Les anciennes charges, vidéos et autres métadonnées de mouvement ne sont pas transférées. L’utilisateur doit choisir une charge adaptée au nouvel exercice.

## Progression et séries avancées

- Les dates de performance sont réelles ; les séances partielles ne sont plus présentées comme une prescription entièrement réalisée.
- Les fourchettes de répétitions des phases restent intactes.
- L’acceptation d’une progression vérifie la performance enregistrée et la prescription côté serveur, puis applique réellement les nouvelles cibles. Une ancienne suggestion ne suffit pas à modifier un programme.
- Les suggestions de plus de 28 jours expirent sans être confondues avec un refus du client.
- Drop set : palier final ajouté explicitement, charge et répétitions séparées, lien avec la série précédente, charge inférieure obligatoire, aucun repos programmé entre les paliers.
- FST-7 : sept séries distinctes, consignes visibles, répétitions et repos explicites. Le preset manuel est 7 × 8–12 avec 45 secondes de repos ; le constructeur utilise 7 × 10. Les prescriptions générées sont limitées aux profils avancés avec option activée.
- Les séries avancées ne sont pas utilisées comme séries standard pour calculer une augmentation ordinaire.

Référence de terminologie : [FST-7, Hany Rambod](https://www.hanyrambod.com/fst7/). Ces paramètres sont des règles produit, pas une validation clinique ni une garantie de résultat.

## Validations réalisées

- TypeScript ; 1 899 tests unitaires, HTTP et interface dans 205 fichiers.
- 25 tests d’intégration sur Postgres/PostgREST jetables : accès propriétaire, écritures directes interdites, double validation simultanée, refus après désactivation, conservation de l’historique et état périmé.
- Cinq migrations appliquées deux fois sur base isolée et appliquées en préproduction.
- Build de production avec configuration synthétique ; serveur de production local : endpoints anonymes refusés avec 401.
- Parité FR/EN/DE : 3 235 clés.
- Aucun compte réel activé, aucun entraînement privé créé/modifié pour ces tests.

Non validé par ces tests : génération mensuelle complète avec un vrai compte et un véritable appel IA, interaction tactile sur téléphone physique, adaptation pendant plusieurs mois réels.

## Déploiement et retour arrière

Appliquer les migrations `20260921145109`, `20260921145357`, `20260921145813`, `20260921173100`, `20260921173200` avant le nouveau frontend. Ne pas activer automatiquement les comptes existants. Vérifier CI, état READY et alias de production avant d’annoncer la mise en ligne.

Pour désactiver un suivi, passer par la préférence du compte. Ne pas supprimer les historiques ou les propositions. Un retour de version frontend conserve les colonnes et tables ; les contrôles SQL de consentement restent actifs. Le statut additionnel `expired` est à conserver : ne pas rétablir une contrainte ancienne qui rejetterait les lignes existantes.

## Suite de l’audit : non résolu dans ce lot

- Transition de fin de cycle/phases et règle explicite de pause, reprise et allègement.
- Plafond de volume cumulé sur plusieurs semaines, au-delà du garde-fou hebdomadaire.
- Incréments de charge adaptés à l’équipement réellement disponible.
- Historique exhaustif par exercice : la lecture des tendances reste plafonnée et signale une troncature.
- Supervision/reprises du worker historique de régénération et activation des programmes planifiés.
- Suivi des mouvements sans charge externe et comparaison de prescriptions historiques modifiées.

Les guides Supabase ont conduit à des tables privées sous RLS, des écritures réservées au serveur et une validation transactionnelle. Les alertes de sécurité préexistantes de préproduction (anciennes fonctions SECURITY DEFINER et protection contre les mots de passe compromis) ne sont pas corrigées par ce lot. Voir [audit des fonctions exposées](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) et [protection des mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
