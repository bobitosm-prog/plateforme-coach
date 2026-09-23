# Permission caméra du prototype iPhone — 23 septembre 2026

## Cause

Le web propose une prise de photo pour les repas via un champ `type="file"`
avec `capture="environment"`. Le paquet iOS installé ne déclarait aucune
raison d'accès à la caméra dans son `Info.plist`. L'autorisation iOS ne pouvait
donc pas être présentée correctement lorsque cette fonction était utilisée.

## Changement

- `NSCameraUsageDescription` ajouté au projet Debug et Release avec un texte
  français de repli.
- `InfoPlist.strings` ajoutés en français, anglais et allemand pour afficher
  la raison dans la langue du téléphone.
- Aucun droit microphone, bibliothèque photo, santé ou suivi ajouté.

## Validation

1. Projet et fichiers de traduction : `plutil -lint` OK.
2. Politique de navigation : 14/14 vérifications réussies.
3. Build Debug iPhone physique signé et lancé, `codesign --verify --deep --strict`
   OK ; la clé est présente dans le `Info.plist` et chaque langue se retrouve
   dans le paquet `.app`.
4. Installation sur iPhone physique OK. Marco confirme que la caméra s'est
   ouverte et qu'il a pu prendre une photo après autorisation. Le résultat de
   l'analyse de la photo et le cas d'un accès refusé ne sont pas encore validés.

Il s'agit toujours du prototype, avec son accès au site de production. Ce lot
ne constitue ni une archive TestFlight, ni une validation de l'analyse photo.

Référence Apple : https://developer.apple.com/documentation/bundleresources/information-property-list/nscamerausagedescription
