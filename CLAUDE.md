# MOOVX - Instructions Claude Code

## REGLE DE SESSION (lecture obligatoire)

**Au demarrage de toute session :**
1. Lire `docs/SESSION_LOG.md` en entier (zone "ETAT ACTUEL" minimum)
2. Confirmer le HEAD et la tache en cours avec l'utilisateur

**Apres chaque commit :**
1. Mettre a jour la zone "ETAT ACTUEL" (date, HEAD, working tree, tache)
2. Ajouter une ligne dans la zone "LOG CHRONOLOGIQUE" :
   - format : `- HH:MM \`<hash>\` <sujet bref>`
3. Commit le SESSION_LOG.md soit avec le commit feature, soit dans un
   commit "docs(log): update session state"

**Apres chaque decision importante (changement de plan, blocker) :**
- Ajouter une ligne dans le log avec horodatage et description
- Pas besoin de commit immediat, batch avec le prochain commit feature

**Ne JAMAIS effacer le log chronologique** — append-only.
Seule la zone "ETAT ACTUEL" est ecrasable.

## Frontend Design Skill
Whenever building or styling UI, follow the guidelines in .claude/skills/frontend-design.md

## Stack
React, Tailwind CSS, TypeScript, Supabase

## Brand
- Palette: noir, or/gold (#D4AF37), blanc
- Direction: Swiss Precision × Athletic Editorial
- Mobile-first
