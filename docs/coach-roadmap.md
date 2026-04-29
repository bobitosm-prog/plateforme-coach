# Coach Perfect Roadmap

## ✅ Sprint 0 - GSAP Landing (29 avril 2026)
- Hero slot-machine reveal
- Gold glow effect

## ✅ Sprint 1A - Coach Templates (29 avril 2026)
- Tags / 15 categories pre-definies
- Recherche filtree (nom + tags)
- Filtre par tags + badges sur cards (AND logic)
- Clone template + auto-edit

## ✅ Sprint 1B - Coach Editor (29 avril 2026)
- Drag-drop exercices @dnd-kit
- IDs name-based stables
- Fix closure stale (state frais via setPDays)
- Dupliquer exercice inline
- Dupliquer jour entier

## ✅ Sprint Mobile Coach (29 avril 2026)
- Hook useIsMobile reutilisable (app/hooks/useIsMobile.ts)
- Bottom nav 5 tabs (Accueil, Clients, Programmes, Messages, Agenda)
- CoachPrograms : grids responsive, cards stack, touch targets HIG
- Profil : grid 1 col + tarif row stack
- Calendrier : titre reduit + nav icon-only
- Home : font sizes + revenue selects
- Clients : header search stack

## ✅ Sprint 2 - Page client enrichie (29 avril 2026)
### Apercu
- Inline edit target_weight + objective
- Weight journey (start -> current -> target)

### Progression
- Frequence d'entrainement heatmap (8/12 semaines)
- Top 5 muscles travailles (bar chart)
- Weight chart enrichi avec target reference line
- Timeline chronologique avec filtres par type
- Empty states coherents

## ⏳ Sprint 3 - Mobile Client (1-2h prochaine session)
- [ ] Bottom nav 5 tabs cote client
- [ ] Pages responsive cote client
- [ ] Pattern : copier celui du coach

## ⏳ Sprint 4 - Communication + nutrition (4-6h)
### Messages chat in-app
- [ ] Table messages, UI conversation, realtime, badges non-lus

### Plan nutritionnel
- [ ] Editeur cote coach, vue cote client, templates

## ⏳ Sprint 5 - Dashboard analytics (3-4h)
- [ ] CA mensuel/annuel, retention, top exos, alertes inactivite

## Tech Debt
- [ ] Lift up save callbacks Apercu (target_weight, objective) au parent
- [ ] Augmenter limit muscles aggregation (workout_sessions)
- [ ] Pagination timeline si > 30 entries
- [ ] Sets array refactor (sets: number -> SetItem[])

## Methodologie validee
- 1 sprint = 1 session 2-4h
- 1 branche par feature
- Diff brut OBLIGATOIRE avant chaque commit
- Test sur preview Mac mode iPhone avant merge
- Documentation au fil de l'eau

## Bug recurrent surveille
Claude Code peut ajouter des liens markdown dans le RENDU du diff
(ex: ex.name -> [ex.name](http://ex.name)) MAIS le fichier sur 
disque reste propre la plupart du temps.
Verification : grep -c '\[propriete\]' fichier.tsx
Si 0 -> juste affichage Claude Code, fichier OK.
Si > 0 -> fix avec Node script.
