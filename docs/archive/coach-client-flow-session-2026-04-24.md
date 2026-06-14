# Session 2026-04-24 — Coach → Client Invited Flow

## Objectif

Debloquer le flux complet : un coach cree un programme, l'assigne a un
client invited, et le client voit + lance la seance depuis son dashboard.

---

## Bugs fixes (4)

### 1. Creation programme coach (program_data → program)

Le coach ne pouvait pas creer de programmes templates. Le code ecrivait
dans une colonne `program_data` inexistante au lieu de `program` (JSONB).
Supabase ignorait silencieusement le champ inconnu.

**Fix** : renommer `program_data` → `program` dans insert, update, et
select de `CoachPrograms.tsx` (3 occurrences).

### 2. Bouton supprimer ne declenchait pas la modale

Le `ConfirmDialog` etait declare dans le `return` du formulaire de
creation (vue `creating === true`), mais le bouton Trash2 est dans la
vue liste (vue `!creating`). Le state `programToDelete` etait set mais
la modale jamais rendue.

**Fix** : deplacer `<ConfirmDialog>` de la vue formulaire vers la vue
liste.

### 3. Liste clients vide dans la modale d'assignation

Le `<select>` lisait `c.full_name` et `c.email` au top level, mais
`fetchClients()` retourne `{ client_id, profiles: { full_name, email } }`.
De plus, `value={c.id}` utilisait l'ID du lien `coach_clients` au lieu
de `c.client_id`.

**Fix** : `value={c.client_id}` + `c.profiles?.full_name || c.profiles?.email`.

### 4. Assignation echoue silencieusement (upsert sans constraint)

L'upsert avec `onConflict: 'client_id'` echouait car aucune contrainte
UNIQUE n'existe sur `client_id` dans `client_programs`.

**Fix** : remplacer l'upsert par un INSERT pur avec check anti-doublon
prealable (select sur `client_id + coach_id + program_name`).

---

## Migrations DB manuelles (3)

Executees dans Supabase SQL Editor (hors `supabase/migrations/`).

```sql
-- 1. Colonne program dans training_programs (existait dans la migration
--    mais pas en prod — drift)
ALTER TABLE training_programs
  ADD COLUMN IF NOT EXISTS program JSONB DEFAULT '{}'::jsonb;

-- 2. Colonne program_name dans client_programs
ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS program_name TEXT;

-- 3. RLS policy pour permettre au coach d'inserer dans client_programs
--    (verifier si deja en place, sinon ajouter)
```

**Dette** : ces migrations ne sont pas dans `supabase/migrations/`. Un
drift existe entre le schema reel en prod et les fichiers de migration
dans le repo.

---

## Helpers crees

### `lib/normalizeCoachProgram.ts`

Convertit le format du programme coach (array de Day objects) en format
attendu par TrainingTab (objet indexe par jours francais).

```
Input:  [{ name: "Jour 1", exercises: [...] }, { name: "Jour 2", ... }]
Output: { lundi: { name: "Jour 1", ... }, mardi: { name: "Jour 2", ... } }
```

Gere aussi l'ancien format objet (passthrough) pour retrocompatibilite.

Integre dans `useClientDashboard.ts` ligne 179.

---

## Dette technique residuelle

### Migration drift

Les 3 ALTER TABLE executes manuellement ne sont pas dans
`supabase/migrations/`. Si quelqu'un recree la DB depuis les migrations,
le schema sera incomplet. A corriger en ajoutant des fichiers de
migration retroactifs.

### Mapping implicite Jour 1 = Lundi

`normalizeCoachProgram` mappe Jour 1 → lundi, Jour 2 → mardi, etc.
C'est un raccourci. Le coach ne peut pas choisir quels jours sont
assignes. Un programme de 3 jours sera toujours lundi/mardi/mercredi.

### Condition DEMARRER assouplie

Le bouton "DEMARRER LA SEANCE" n'est plus restreint a `trainingIsToday`.
Il apparait des qu'il y a des exercices sur le jour selectionne. Cela
permet au client de lancer n'importe quelle seance n'importe quel jour,
mais la logique `todaySessionDone` ne s'applique plus correctement aux
jours autres que aujourd'hui.

### Pas de feedback visuel d'assignation reussie

Quand le coach assigne un programme, la modale se ferme mais il n'y a
pas de toast de confirmation. L'utilisateur ne sait pas si ca a marche
(sauf en allant verifier cote client).

---

## Ameliorations futures identifiees

1. **UX "client choisit son jour"** — Remplacer le mapping implicite
   par une UI ou le client voit la liste des seances du programme et
   choisit laquelle lancer, independamment du jour de la semaine.

2. **Multi-programme par client** — Permettre d'assigner plusieurs
   programmes differents au meme client (la table le supporte deja,
   le code aussi apres le fix anti-doublon par program_name).

3. **Toast de confirmation** — Ajouter `toast.success('Programme assigne')`
   apres un insert reussi dans `assignToClient()`.

4. **Migration retroactive** — Creer des fichiers `.sql` dans
   `supabase/migrations/` pour les 3 ALTER TABLE executes manuellement.

5. **Erreur handling coach** — Ajouter une gestion d'erreur propre avec
   feedback visuel (toast d'erreur) au lieu de `console.error` silencieux
   dans `saveProgram()` et `assignToClient()`.

6. **Vue coach : clients assignes** — Sur chaque programme template,
   afficher un badge "X clients" avec la liste des clients qui ont ce
   programme.
