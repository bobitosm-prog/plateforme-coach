# iOS — retours d'authentification, 29 septembre 2026

## Audit terrain

Base web : main `952d5275`. Prototype natif : branche conservée
`codex/ios-webview-recovery`, build distribué 0.1.0 (6).

- Le callback web échange un code via Supabase SSR et utilise les cookies du
  navigateur initiateur. Les routes signup, recovery et invitation sont distinctes.
- Le filtre natif autorise uniquement HTTPS app.moovx.ch et refuse les popups.
  OAuth externe est donc bloqué avant son retour ; aucun universal link ni
  gestionnaire `onOpenURL` n'est présent dans le prototype inspecté.
- Safari et la WKWebView ne partagent pas automatiquement leur magasin de
  session. Ouvrir simplement le fournisseur dans Safari ne suffit pas à assurer
  l'échange PKCE ni la connexion de l'app.
- Aucun changement du schéma, des rôles, des politiques RLS ou des réglages Auth
  n'est nécessaire pour ce lot de qualification. Aucun compte ou email créé.

## Lot livré

**Tâche :** qualifier les retours web avant une intégration native.
**Scope :** tests runtime de la route existante et preuves documentées.
**Logique attendue :** navigation interne, traitement explicite des échecs,
marqueur de récupération limité, reconnexion après confirmation d'inscription.
**Validations 4/4 :** route GET réellement exécutée avec fournisseur simulé ;
cas positifs/négatifs ; TypeScript et contrats existants ; frontière native
exécutée sans compte ni données réelles.
**Livrable :** `tests/unit/auth-callback-runtime.test.ts` et ce rapport.
**Contraintes :** aucun changement produit, secret, fournisseur réel, envoi
email, achat ni ouverture arbitraire des domaines autorisés dans WebKit.

## Résultats locaux avant commit

- 25 tests ciblés réussis (4 fichiers), dont 12 nouveaux cas runtime de callback.
- 14 assertions de navigation native et 7 assertions du pont repos réussies.
- TypeScript : réussi.
- Le test physique A → B → A est validé par Marco, voir le suivi nutrition.

Ces tests utilisent la vraie route Next.js et un fournisseur simulé ; ils ne
certifient ni la délivrabilité email, ni OAuth réel, ni le retour iPhone.

## Prochain lot

Priorité email ou Google/Apple à préciser avec Marco. Pour le parcours retenu :
conserver l'échange PKCE dans un contexte cohérent, définir le retour vers
l'app et vérifier annulation, lien expiré, app fermée et session finale dans
la WKWebView. Ne pas assimiler l'ouverture d'un navigateur externe à une
session native établie. Un changement natif demandera un nouveau build et
une validation sur appareil avant clôture.

Références consultées : [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[changelog Supabase](https://supabase.com/changelog). Aucun changement récent
pertinent de l'API SSR utilisée n'a été identifié pour ces tests.
