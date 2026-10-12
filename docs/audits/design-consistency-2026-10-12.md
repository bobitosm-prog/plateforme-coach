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
