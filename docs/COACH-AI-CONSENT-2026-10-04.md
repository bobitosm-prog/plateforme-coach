# Génération Athena depuis le dossier client

Le coach peut demander un programme ou un plan alimentaire uniquement pour un client
lié par une relation active issue d’une invitation ou de l’administration. L’accord
Anthropic doit avoir été enregistré par le client, dans la version en vigueur.

Le serveur distingue l’auteur de la demande (droits et quota du coach) du sujet des
données (profil, exclusions et accord du client). La relation et l’accord sont relus
avant chaque envoi au fournisseur, y compris les tentatives suivantes. Les autres
routes IA refusent la délégation. Le coach ne peut ni accorder ni retirer l’accord
du client. Aucune clé de service supplémentaire n’est utilisée.

Le résultat reste un aperçu à vérifier et sauvegarder par le parcours coach existant.
La génération déléguée ne peut pas activer un plan personnel. L’identité du coach
affichée est vérifiée à nouveau au clic pour bloquer un changement de compte.

## Validation — 4 axes

1. Autorisation : tests runtime du vrai garde et transport, accord manquant/refusé,
   relation absente/default/legacy/terminée, révocation pendant génération,
   panne de lecture, changement de compte.
2. Données : tests des routes entraînement/nutrition avec profils synthétiques,
   sujet client transmis au générateur et aux restrictions, quota du coach,
   rejet d’une activation personnelle déléguée avant réservation/envoi.
3. Base : migration idempotente appliquée deux fois sur PostgreSQL isolé,
   tests RLS de lecture coach et refus de modification/RPC pour autrui ;
   32 tests d’intégration et restauration de sauvegarde synthétique réussis.
4. Compilation : build de production, TypeScript, ESLint ciblé et parité
   FR/EN/DE réussis. 54 tests ciblés réussis après adaptation du contrôle
   statique de contexte nutrition au sujet vérifié.

La suite générale avait 2372 succès et 7 échecs : le contrôle statique modifié dans
ce lot a ensuite été corrigé et retesté ; les six autres sont les échecs déjà
présents sur main dans training-v2-no-session-hierarchy, training-v2-shell-focus
et training-v2-timeline-timer-tools. Aucun fichier Training n’a été modifié.

La migration distante est 20261004102837_coach_ai_consent_read ; aucune décision
utilisateur ni aucun programme réel n’a été modifié pour les essais.

Les conseillers Supabase ne signalent pas la table ai_consents. Les avis existants
hors périmètre concernent des tables serveur sans politique client, des fonctions
SECURITY DEFINER et la protection des mots de passe compromis :
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Vérification utilisateur

Dans le compte client, autoriser Athena dans Compte → Préférences. Depuis le dossier
client du coach, générer un programme puis un plan alimentaire et vérifier les aperçus.
Retirer l’accord dans le compte client : une nouvelle génération doit expliquer
comment le rétablir, et les modifications manuelles doivent rester disponibles.

Aucun appel Anthropic réel ni changement d’un programme client n’a été effectué
pendant la validation automatisée.
