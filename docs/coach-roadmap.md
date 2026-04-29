# MoovX Roadmap

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
- Hook useIsMobile reutilisable
- Bottom nav 5 tabs
- Toutes pages coach responsive
- Touch targets HIG
- Safe-area-inset-bottom

## ✅ Sprint 2 - Page client enrichie cote coach (29 avril 2026)
### Apercu
- Inline edit target_weight + objective
- Weight journey display (start -> current -> target)

### Progression
- Frequence d'entrainement heatmap (8/12 semaines)
- Top 5 muscles travailles (bar chart)
- Weight chart enrichi avec target reference line
- Timeline chronologique avec filtres par type

## ✅ Sprint 3 - Mobile Client (29 avril 2026)
- ClientProgram : selecteur jour mobile + nav fleches
- ClientNutrition : meal tracker mobile + macros 2x2 + food 3 cols
- Bottom nav 6 tabs deja en place
- Pattern useIsMobile reutilise

## Architecture 2 types de clients (existante)
- coach_clients table + profiles.subscription_type
- 'invited' = client coache (gratuit, controle par coach)
- 'client_monthly'/'client_yearly' = client solo (payant, IA active)
- Permissions via useClientPermissions
- 5 endpoints IA : /api/generate-program, /api/generate-meal-plan, 
  /api/chat-ai, /api/analyze-body, /api/generate-custom-program
- Tous gated par !isInvited cote client

## ⏳ Sprint 4 - Communication + nutrition avancee (4-6h)
### Messages chat in-app (cote coach + client coache)
- [ ] Realtime Supabase ameliore
- [ ] Notifications nouveau message
- [ ] Badge non-lus dans bottom nav
- [ ] Status read receipts

### ChatAI cote client solo
- [ ] Conditional bottom nav (Msgs OR ChatAI selon isInvited)
- [ ] Polish UX ChatAI

### Plan nutritionnel cote coach
- [ ] Editeur cote coach (assigner un plan a un client)
- [ ] Templates plans (cut/bulk/maintenance)

## ⏳ Sprint 5 - Dashboard analytics global coach (3-4h)
- [ ] CA mensuel/annuel
- [ ] Retention (clients actifs vs inactifs)
- [ ] Top exos utilises tous clients confondus
- [ ] Frequence moyenne entrainement par client
- [ ] Alertes : clients inactifs depuis X jours

## Tech Debt
- [ ] Lift up save callbacks Apercu (target_weight, objective) au parent
- [ ] Augmenter limit muscles aggregation (workout_sessions)
- [ ] Pagination timeline si > 30 entries
- [ ] Sets array refactor (sets: number -> SetItem[])
- [ ] ChatAI conditional in client bottom nav

## Methodologie validee
- 1 sprint = 1 session 2-4h
- 1 branche par feature
- Diff brut OBLIGATOIRE avant chaque commit
- Test sur Mac mode iPhone avant merge
- Documentation au fil de l'eau

## Bug recurrent surveille
Claude Code peut ajouter des liens markdown dans le RENDU du diff.
Verification : grep -c '\[propriete\]' fichier.tsx
Si 0 -> juste affichage Claude Code, fichier OK.
Si > 0 -> fix avec Node script.

## Patterns techniques valides
- useIsMobile (app/hooks/useIsMobile.ts) : matchMedia 640px breakpoint
- Inline edit (Pencil + Check + X) > Modal pour champs simples
- IDs stables (name-based) pour dnd-kit
- State frais via setPDays(prev => ...) pour eviter closures stales
- safe-area-inset-bottom pour iPhones avec encoche
- touchAction: 'none' pour drag-drop tactile
- Selecteur jour mobile (mini-buttons + ChevronLeft/Right) pour grilles 7+ cols
