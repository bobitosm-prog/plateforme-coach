# Connexion Apple — préparation du 29 septembre 2026

## Audit terrain

Le bouton Apple web appelle déjà Supabase OAuth. Inspection des consoles :
fournisseur Apple désactivé dans CoachPlatform, aucun Client ID ni secret OAuth
configuré ; capacité Apple désactivée sur `ch.moovx.app` ; aucun Services ID.
Le build 6 bloque les navigations OAuth externes et ne possède pas de pont Apple.

Lecture seule des fonctions de production `handle_new_user` et `set_role` : le
profil sans rôle Apple explicite reçoit actuellement `client`. La RPC autorise
uniquement la pose initiale client/coach ; elle ne remplace jamais un rôle existant.
Aucune modification de schéma ou d'autorisation métier dans ce lot.

## Contrat de livraison

**Tâche :** connecter le bouton Apple de login au dialogue natif iOS tout en
conservant OAuth pour les navigateurs.
**Scope :** helper web, écran login, pont Swift, entitlement et tests.
**Logique attendue :** nonce aléatoire à chaque tentative ; hash transmis à
Apple ; jeton et nonce brut vérifiés par Supabase via le client SSR du navigateur
courant. La session est donc écrite dans les cookies de cette WKWebView.
**Validations 4/4 :** TypeScript/Swift ; tests nonce/annulation/erreur ; rendu et
clic du vrai écran login avec fournisseur simulé ; contrôles d'origine du pont.
L'authentification Apple réelle et le build signé restent des étapes requises
après configuration : cette préparation ne les marque pas réussies.
**Livrable :** changement web séparé du worktree natif, activation fournisseur,
build TestFlight suivant, puis contrôle iPhone.
**Contraintes :** aucun secret dans le dépôt, les logs, les URL ou la conversation ;
aucun navigateur arbitraire autorisé ; pas de transfert des cookies Safari.

## Frontières

- Pont avec réponse liée à l'appel JS d'origine, limité à la frame principale
  HTTPS app.moovx.ch et au port standard. Une seule requête Apple en cours.
- Fermeture, navigation, interruption WebKit et expiration annulent l'attente.
  Une réponse tardive d'un ancien contrôleur est ignorée.
- Annulation utilisateur : aucun échange de jeton ni redirection externe.
- Échec : message traduit existant ; détails fournisseur jamais affichés.
- Nom Apple de première autorisation conservé dans les métadonnées si aucun nom
  existant, sans écrasement. L'onboarding reste responsable du profil métier.
- Cette préparation raccorde le bouton de **connexion**. L'inscription avec choix
  coach/client conserve son parcours web existant. Ne pas annoncer sa prise en
  charge native tant que le rôle initial OAuth n'est pas qualifié séparément.
- Les adresses masquées Apple peuvent représenter un autre compte que l'email
  d'un compte MoovX existant. Aucune fusion manuelle de comptes dans ce lot.

## Configuration préparée, non activée

- App ID existant : `ch.moovx.app`, capacité Sign in with Apple.
- Service web proposé : `ch.moovx.app.web`, rattaché à cette app primaire.
- Domaine fournisseur : `njlzossopgknanhkzcbk.supabase.co`.
- Retour fournisseur : `https://njlzossopgknanhkzcbk.supabase.co/auth/v1/callback`.
- Retour de session web : `https://app.moovx.ch/auth/callback`.
- Client IDs Supabase : App ID natif et Service ID web ; ne pas désactiver la
  validation du nonce ni l'exigence d'email.
- Clé privée Apple conservée hors dépôt ; secret OAuth dérivé enregistré seulement
  dans Supabase. Rotation requise au plus tard à son expiration (maximum 6 mois).

Activation soumise à confirmation de l'utilisateur par l'outil navigateur.
Aucun compte Apple utilisateur ni mot de passe ne doit être envoyé dans le chat.

Référence officielle : [Supabase — Sign in with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).
