# Connexion Apple — build 7, 29 septembre 2026

## Activation autorisée

Marco a confirmé explicitement l'activation Apple pour l'app et le site.
Capacité Sign in with Apple activée sur `ch.moovx.app` (app primaire).
Service `ch.moovx.app.web` créé et rattaché à l'app ; domaines app.moovx.ch et
njlzossopgknanhkzcbk.supabase.co, callback HTTPS Supabase /auth/v1/callback.
Fournisseur Supabase affiché Enabled ; Client IDs web puis natif, email requis.

Clé dédiée Sign in with Apple créée, téléchargée puis déplacée dans un dossier
local privé hors dépôt (700, fichiers 600). Secret OAuth généré et signature
ES256 vérifiée localement ; expiration 28 mars 2027. Aucune valeur secrète dans
le chat, le dépôt ou les journaux. La saisie/enregistrement du secret dans
Supabase a été confiée à Marco ; confirmation encore attendue.

## Code et validations

- Web : PR 82 fusionnée, commit main c6134bbd ; CI complète et production Vercel
  réussies. 2 163 tests locaux, TypeScript, tests du vrai écran login avec Apple
  simulé et vérification nonce/erreurs/annulation réussis.
- Natif : branche `codex/ios-apple-sign-in`, pont limité à la frame principale
  app.moovx.ch, réponse liée à l'appel initial, annulation sur navigation/fin de
  processus/fermeture. 33 assertions de politiques et builds simulateur réussis.
- Build Release 0.1.0 (7) archivé et exporté. Signature vérifiée strictement,
  bundle ch.moovx.app, droit Apple Sign In présent, get-task-allow désactivé.
- Build simulateur Release installé et processus lancé avec succès. Le contrôle
  du dialogue Apple et la connexion complète ne sont pas validés par ce lancement.
- Envoi App Store Connect réussi et traitement terminé. Déclaration de chiffrement
  renseignée (cryptographie fournie par le système). Build 0.1.0 (7) attribué au
  groupe « Marco — bêta interne » ; groupe et son testeur visibles sur le build.
  Consignes de test Apple enregistrées dans TestFlight.

## À clôturer

- Confirmation de saisie du secret web, puis parcours OAuth web réel.
- Test iPhone Apple : annuler, se connecter, retrouver le bon compte et sa session
  après fermeture. Une adresse Apple masquée peut désigner un nouveau compte ;
  aucune fusion automatique supplémentaire ni copie de données ajoutée ici.
- Inscription avec choix coach/client : parcours web existant, hors raccordement
  natif du bouton login livré dans ce lot ; rôle initial à qualifier séparément.
