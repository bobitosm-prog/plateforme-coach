# Audit de cohérence MoovX — 12 octobre 2026

## Point de reprise

Le dernier nettoyage est le sous-lot 11, commit `8ab74cf4`, sur `codex/cleanup-batch-zero` : 49 anciens composants archivés. Son journal est `docs/audits/cleanup-2026-10-07.md` sur cette branche. Il ne fait pas partie de `origin/main`. Ne pas reprendre les suppressions sur main comme si elles avaient déjà été livrées, ni fusionner cette ancienne branche sans réconciliation des correctifs récents.

La présente passe part de `88f9f978` (production après correction du bouton S’abonner). Aucun composant, route, média ou donnée supprimé. Aucune migration ou écriture DB : changements de présentation uniquement.

## Méthode et limites

Passe 1 : inventaire des 37 fichiers page.tsx (19 application, 18 site), parcours des imports locaux et inventaire des modals. Passe 2 : comparaison avec app-design-tokens et HomeV2, lecture des styles locaux, vérification des points d’entrée du Compte. Les imports anciens sont des candidats, pas une preuve automatique d’écart : certains fichiers n’en importent que des constantes métier, et plusieurs interfaces corrigées utilisent un CSS module propre. Les layouts et styles admin/marketing ont été examinés séparément du graphe.

Passe 3 : navigateur local mobile pour les accès publics corrigés et tests ciblés. Aucun nouveau parcours connecté client/coach/admin ni test iPhone physique exhaustif n’est revendiqué. « Inventorié » ne signifie pas « validé visuellement ». Les états chargement/erreur et chaque sous-modal nécessitent leur propre contrôle.

Référence : Outfit, fond sombre, or #dfbf70, carte #211f18 avec bordure #393326, rayon 20 px, boutons lisibles, titres non condensés. Conserver les couleurs sémantiques succès/erreur ainsi que l’identité des boutons Apple/Google.

## Premier lot de corrections

Connexion, inscription, invitation et nouveau mot de passe utilisent désormais app-design-tokens. Titres en casse naturelle en FR/EN/DE, boutons d’action dorés unis, champs à 16 px, contours de focus et réduction des animations des formulaires connexion/inscription. Fond d’inscription : position fixed portée par le conteneur plutôt que Next Image avec fill, qui provoquait une erreur au runtime local.

La logique de session, les fournisseurs OAuth, la confirmation d’e-mail, les consentements et les droits ne sont pas modifiés.

## Les 37 modèles de pages

| Page | Constat source / traitement | Contrôle visuel connecté |
| --- | --- | --- |
| `/admin/campaigns` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/admin/feedback` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/admin/logs` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/admin` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/admin/revenue` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/admin/users` | Ancien thème confirmé : admin.css utilise Bebas Neue ; lot administration distinct. | Non rejoué dans cette passe |
| `/client/[id]` | Ancien thème confirmé dans le dashboard coach et la fiche client ; lot coach distinct. | Non rejoué dans cette passe |
| `/coach` | Ancien thème confirmé dans le dashboard coach et la fiche client ; lot coach distinct. | Non rejoué dans cette passe |
| `/join` | Thème ancien confirmé ; premier lot corrigé. Reset : formulaire protégé, contrôle avec session à rejouer. | Non rejoué dans cette passe |
| `/login` | Thème ancien confirmé ; premier lot corrigé. Reset : formulaire protégé, contrôle avec session à rejouer. | Non rejoué dans cette passe |
| `/onboarding` | Thème app déjà importé ; états partagés de génération/erreur encore mixtes. Conserver les routes de compatibilité. | Non rejoué dans cette passe |
| `/onboarding-coach` | Thème app déjà importé ; états partagés de génération/erreur encore mixtes. Conserver les routes de compatibilité. | Non rejoué dans cette passe |
| `/onboarding-fitness` | Thème app déjà importé ; états partagés de génération/erreur encore mixtes. Conserver les routes de compatibilité. | Non rejoué dans cette passe |
| `/onboarding-photo` | Thème app déjà importé ; états partagés de génération/erreur encore mixtes. Conserver les routes de compatibilité. | Non rejoué dans cette passe |
| `/onboarding-v2` | Thème app déjà importé ; états partagés de génération/erreur encore mixtes. Conserver les routes de compatibilité. | Non rejoué dans cette passe |
| `/` | Cinq onglets principaux modernisés ; écrans secondaires et composants mixtes détaillés ci-dessous. | Non rejoué dans cette passe |
| `/register-client` | Thème ancien confirmé ; premier lot corrigé. Reset : formulaire protégé, contrôle avec session à rejouer. | Non rejoué dans cette passe |
| `/reset-password` | Thème ancien confirmé ; premier lot corrigé. Reset : formulaire protégé, contrôle avec session à rejouer. | Non rejoué dans cette passe |
| `/weekly-diagnostic/[id]` | Anciennes polices/tokens et cartes 16 px : à harmoniser. | Non rejoué dans cette passe |
| `/[locale]/blog/[slug]` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/blog` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/cgu` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/coach-sportif-ia` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/guides/[slug]` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/landing` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/macros` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/menu-perte-de-poids` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/menu-prise-de-masse` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/perte-de-poids` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/prise-de-masse` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/proteines-par-jour` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/nutrition/repas-sportifs` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/outils/calculateur-calories-macros` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/privacy` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/programmes/musculation/3-jours` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/programmes/musculation/debutant` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |
| `/[locale]/support` | Identité du site distincte à revoir par gabarit (landing/SEO/légal/support), pas une conformité Home certifiée. | Non rejoué dans cette passe |

## Onglets et écrans secondaires

| Circuit | Constat | Lot suivant |
| --- | --- | --- |
| Home | HomeV2 sert de référence ; bandeau essai conserve FONT_ALT ancien. | Harmoniser seulement le bandeau, préserver le Home validé. |
| Training | Enveloppe modernisée ; détails séance terminée, techniques et éditeur de programme importent encore l’ancien thème. | Examiner les composants réellement montés, puis vérifier vidéos et boutons de retour. |
| Nutrition | NutritionOverview modernisé ; recherche aliments, recettes, liste de courses, import de plan et préférences encore mixtes. | Harmoniser les feuilles et formulaires, préserver les saisies/calculs. |
| Analytics | AnalyticsCompact est la référence ; imports anciens dans composants auxiliaires. | Contrôler ajouts de mesures/photos, vues vides/erreur. |
| Compte | AccountTab et AccountSection ont leur CSS moderne ; sous-sections encore mixtes. | Profil, objectifs, préférences, messages, retours coach, historique paiements, suppression. |
| Athena | ChatAI/AthenaMessageContent importent encore les anciens tokens. | Examiner le chat ouvert, son chargement et les liens. |
| Abonnement | ApplePaywall modernisé ; Paywall web conserve les anciens titres et cartes. | Parité web/native, prix inchangés et fournis par chaque canal. |
| Onboarding | Étapes utilisent app-design-tokens. | InitialGenerationStatus et PostAuthFatalState utilisent l’ancien thème ; tester consentement/génération/retour. |

## Modals

Base app déjà utilisée : ConfirmDialog, ModalHeader, BadgesModal, BmrModal, ExerciseDetailModal, ExerciseSearchModal, MeasureModal, ObjectiveModal, WeightModal, SessionDetailModal. CSS moderne distinct : LegalDocumentDialog, ExerciseInfoPopup, RecoveryModal. Ceci est un constat de source, pas un test de chaque état.

À recouper : TechniquePopup, SessionDoneModal, ImportPlanSheet, FoodSearch, BarcodeScanner, BugReport, consentement IA et filtres/éditeurs. StartProgramModal, OverloadModal et VideoFeedbackModal doivent d’abord être recoupés avec le graphe actif et le journal de nettoyage ; ne pas refaire le design d’un composant débranché.

## Ordre de reprise

1. Accès au compte : lot actuel.
2. Secondaires Compte et états de génération/erreur.
3. Modals Training/Nutrition et chat Athena.
4. Diagnostic hebdomadaire et abonnement web.
5. Coach, administration puis gabarits du site : revue séparée, sans modifier en masse le thème historique partagé.
6. Réconcilier les 11 lots d’archives avec main, puis reprendre les retraits documentés.

Le nettoyage reste ouvert. Aucun écran protégé n’est déclaré conforme uniquement parce que les tests unitaires passent.

## Validation du lot accès

15 tests ciblés réussis (dont interactions runtime du bouton Apple), TypeScript sans erreur et parité i18n 3773 clés × 3 langues. Navigateur local 393 × 852 : connexion → mot de passe oublié → retour → choix du profil → formulaire client ; police Outfit calculée, champs 16 px, aucun débordement horizontal. Modal CGU chargé puis refermé avec retour au formulaire. Vue grand écran inspectée. Aucun compte créé, mot de passe changé ou achat déclenché.

Invitation avec jeton et nouveau mot de passe avec session de récupération : non rejoués de bout en bout ; seules leur présentation et les protections existantes ont été vérifiées par le code et les tests. Ces limites ne sont pas une validation 4/4 de toute l’app.

## Lot Profil, Objectifs et Préférences

Les trois sous-pages utilisent le thème app (Outfit, cartes brun sombre rayon 20 px, or commun). Titres en casse naturelle FR/EN/DE, petits textes remontés à 13 px minimum, champs 16 px, boutons au moins 44 px, focus visible. Objectifs et outils du profil sont de vrais boutons. Les switches des préférences sont nommés et exposent leur état. Les cartes IA et suivi Athena utilisent le même thème. SectionTitle propose un thème app explicite sans changer ses autres consommateurs.

Le padding bas redondant et minHeight 100vh sont retirés : le parent client-main-scroll réserve déjà la place du menu. Calculs, appels de sauvegarde, droits et logique de consentement inchangés. Aucune suppression du plan de nettoyage.

Validation locale : 20 tests runtime ciblés, TypeScript et parité des traductions. Banc de prévisualisation temporaire avec données fictives, retiré avant commit : trois pages rendues, ouverture/annulation des champs calories et téléphone, retour profil ; largeur DOM 393 px, champs 16 px et absence de débordement horizontal. Capture grand écran conservée dans le dossier de visualisations. Ce banc ne valide pas la persistance réelle ni le parcours connecté iPhone ; les actions de sauvegarde et réglages sont testées avec dépendances simulées. Le suivi Athena sans session affiche son erreur prévue.

Prochain sous-lot : Messages, retours coach, historique de paiements et modals du compte ; puis états de génération/erreur.

## Lot Messages et rapports

MessagesTab, FeedbackTab et le modal BugReport (accès actuel depuis Compte) utilisent désormais Outfit, les fonds/cartes/bordures MoovX, des titres en casse naturelle avec point, des commandes de 44 px et des champs de 16 px. Les bulles sortantes sont dorées unies, les accusés de lecture contrastés ; les longues chaînes peuvent revenir à la ligne. Le faux statut « En ligne », qui n’était lié à aucune présence réelle, est remplacé par une description neutre. L’instruction obsolète du bouton flottant des rapports renvoie désormais au point d’entrée Compte.

Les appels réseau, destinataires, payloads, limites de saisie, lecture des rapports et marquage comme lu restent inchangés. Les rapports sont des retours de l’équipe MoovX (bugs/suggestions), pas des retours coach vidéo. Ces derniers restent à recouper avec le parcours actif avant modification.

Validation : 23 tests ciblés réussis, dont édition/envoi simulé et retour de la messagerie, absence de coach, deux sens de messages, chargement/erreur/retry/vide/réponse des rapports, bascule du modal et payload de signalement simulé. TypeScript, diff et parité i18n contrôlés. Navigateur local à 393 × 852 avec données fictives : champs 16 px, pas de débordement, consultation des réponses et fermeture du modal ; captures enregistrées. Les endpoints de rapports sont simulés uniquement dans le banc local temporaire, retiré avant commit. Aucun message, rapport ou donnée réelle envoyé. Pas de validation physique iPhone ni d’envoi de photo réel dans ce lot.

Prochaine passe : historique de paiements, confirmation de suppression et états génération/erreur ; vérifier aussi le zoom des images jointes et les retours vidéo coach dans leur contexte actif.

## Lot paiements, confirmation et états de préparation

PaymentHistory, DeleteAccountSection, les styles résiduels de AccountSection, InitialGenerationStatus et PostAuthFatalState passent au thème app. Historique plus lisible, confirmation avec titre naturel, champ 16 px et commandes 48 px, cartes de préparation/erreur rayon 20 px et focus visible. Titres de suppression et erreurs profil en casse naturelle FR/EN/DE. Le calque de suppression utilise Z_MODAL (1100) au lieu de 60, inférieur à Z_NAV (999) ; rôle dialog et description accessibles ajoutés. La préparation respecte la safe area supérieure.

Montants, catalogue Apple, appels de paiement, logique de suppression, consentement et génération inchangés. Aucun achat, aucune suppression ni requête réelle de génération.

Validation : 25 tests ciblés (historique vide/statuts, mot exact de suppression et annulation sans requête, relances par domaine/finalisation, consentement différé, erreurs de profil), TypeScript et parité i18n. Prévisualisation locale mobile 393 × 852 sur données fictives : historique, ouverture/annulation de confirmation, préparation interrompue et relance simulée, erreur profil ; pas de débordement. Banc temporaire supprimé. Captures conservées ; pas de validation physique iPhone ni de suppression réelle.

Prochain lot : abonnement web et diagnostic hebdomadaire ; conserver les limites du présent audit pour les états connectés et les médias.

## Lot abonnement web et diagnostic hebdomadaire

Paywall web et WeeklyDiagnosticDetailContent utilisent les tokens app : Outfit, cartes 20 px, boutons 48 px et focus visible. Prix mensuel et annuel mis en avant, boutons sans découpe, titres naturels FR/EN/DE. Le diagnostic conserve ses couleurs de score, avec textes plus lisibles, grille sans débordement, retour nommé et accordéon accessible. Animations d’entrée du paywall supprimées pour afficher immédiatement les offres.

Tarifs, choix Apple natif, checkout Stripe, données et application des ajustements inchangés. Validation locale : 15 tests ciblés, dont choix annuel simulé et prévention du double clic, branche native Apple, diagnostic expiré non applicable, accordéon et retour. TypeScript, parité i18n et diff vérifiés. Paywall vu dans le navigateur local à 393 px : Outfit, boutons >=48 px et aucun débordement ; capture desktop conservée. Le diagnostic est vérifié par rendu runtime simulé, pas sur un compte réel ni iPhone physique. Banc local retiré avant commit.

Prochain lot : modals secondaires Training/Nutrition et parcours Athena ; conserver un audit séparé des médias et des écrans coach/admin.

## Lot Athena, détail séance et calculateur calorique

Trois composants actifs harmonisés : ChatAI (tokens app, textes lisibles, saisie 16 px, commandes nommées, bulles dorées), SessionDetailModal (titre, fermeture 44 px, sémantique dialog), BmrModal (largeur 680 px, suppression hauteur vide imposée, champs 16 px avec labels et focus). CSS partagé limité aux trois panneaux. Calculs, sauvegarde profil, historique et requêtes IA conservés. Correction de l’ordre des hooks de ChatAI : le retour anticipé sans droit IA arrive désormais après les hooks ; garde d’envoi explicite conservant l’interdiction IA.

Validation : quatre tests runtime locaux pour refus IA/fermeture, envoi simulé, calcul avec payload de sauvegarde simulé et détail de séance. TypeScript, parité i18n et diff vérifiés. Navigateur : calculateur à 393 px sans débordement, inputs 16 px et fermeture vers aperçu séance. Capture desktop conservée. Pas d’envoi IA réel, pas de modification de profil réel, pas de vérification physique iPhone. Prévisualisation temporaire retirée.

Restent notamment : recherche/détail exercices, poids/mensurations, modals repas et médias ; le présent lot ne clôt pas l’audit global.

## Correction après retour visuel : Voir la séance et Athena

Le précédent lot avait couvert le cadre SessionDetailModal mais pas TrainingSessionDone / WorkoutDetailList, encore sur les tokens historiques. Les deux contenus sont maintenant harmonisés et l’entrée historique Training réutilise le même cadre que Home. Suppression du hero photo et des animations superposées à l’ouverture, titre adaptatif, cartes 20 px, séries espacées.

Athena reçoit une vraie nouvelle disposition : titre Athena., colonne jusqu’à 800 px, réponses en cartes larges, marges 20–24 px, saisie multiligne, résumé repliable et suggestions verticales sur mobile. Suppression du statut toujours « en ligne » non lié à une présence. Le panneau est téléporté via RailOverlay ; scroll automatique sans animation et callback nettoyé. Rendu Markdown conservé, tokens harmonisés. Consentement, modèle, endpoints, historique et suppression restent inchangés.

Vérification : tests runtime envoi/fermeture/refus IA et conversation, rendu mobile 393 × 852 sur données fictives pour le chat et le contenu complet de séance. Pas de débordement ; captures athena-aere-mobile.png et seance-detail-mobile.png conservées. Réduction des animations vérifiée ; disparition du gel sur iPhone physique non confirmée. Banc temporaire supprimé, aucun message envoyé ni donnée réelle modifiée.

## Lot poids et mensurations

WeightModal et MeasureModal : fenêtres au thème app, largeur limitée à 680 px, hauteur adaptée au contenu avec défilement et safe area. Suppression du minimum 90vh. Titres 28 px en casse naturelle (mensurations FR/EN/DE), champs 16 px, poids 48 px, historique lisible. Radix Dialog et RailOverlay reprennent les patterns existants pour le focus, Échap, le portail et le blocage du rail ; clic extérieur ignoré pour ne pas perdre une saisie accidentellement. Labels reliés aux champs.

Contrats de sauvegarde, dates et champs conservés ; aucune modification DB. Sept tests runtime locaux du groupe secondary-panels, dont poids/date et mensuration partielle avec sauvegardes simulées. Vérification visuelle à 393 × 852 : pas de débordement horizontal, historique défilant, saisies et retours fonctionnels. Captures poids-mobile.png et mensurations-mobile.png. Aucun profil réel modifié, pas de test physique iPhone. Banc temporaire retiré.

Audit exercices : ExerciseSearchModal ne possède aucun appel dans app ; conservé sans suppression. Le catalogue actif est ExerciseCatalogCard → ExerciseInfoPopup, déjà en Outfit et cartes dorées. Prochaine passe : modals repas et médias actifs, avec vérification de leur contenu complet.

## Lot fenêtres de repas

ImportPlanSheet actif dans NutritionTab : ancienne police et dégradé supprimés, cartes aliments lisibles, commandes harmonisées, suppression de l’espace de 80 px sous les boutons. Réutilisation de TrainingSheet viewportContained pour le focus, Échap et le défilement. Ce cadre reçoit le thème app (Outfit, titre 28 px, largeur 680 px, contraste des descriptions), ce qui harmonise aussi MealAddSheet et MealComposer. Choix du repas et styles internes du composeur alignés ; quantités, calories et callbacks inchangés. Aucun schéma ni requête DB modifié.

Validation : 23 tests runtime ciblés (import/annulation, titre coach, Échap, sources du composeur, journal). Navigateur local 393 × 852 sur fixtures : import simulé, sélection du contexte, composeur avec nom long, recalcul 150 → 200 g (195 → 260 kcal), confirmation d’abandon, sources d’ajout. Aucun débordement horizontal. Captures import-repas-mobile.png, composeur-repas-mobile.png, ajout-repas-mobile.png. Banc temporaire supprimé ; aucune donnée réelle enregistrée, caméra non activée.

Restent à auditer séparément : FoodSearch, BarcodeScanner, recettes et affichage des photos. Le présent lot ne couvre pas encore ces contenus médias.
