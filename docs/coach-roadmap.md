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

## Sprint 6 — Progressive Overload IA (planifie)

### Vision
Apres une seance ou TOUTES les series d'un exercice ont ete validees
au nombre de reps recommande, l'IA propose une progression de charge
pour la prochaine seance, basee sur :
- Type d'exercice (compose : squat, bench, dl → +2.5/5kg ; isolation : curl → +1.25kg)
- Historique du client (tendances reussite, derniers RPE)
- Phase du programme (volume/force/puissance si tag connu)
- Niveau du client (debutant : +5% ; avance : +1-2%)

### Scope
- **Clients SOLO uniquement** (canUseAI=true via useClientPermissions)
- Detection apres seance complete (pas pendant)
- Proposition affichee :
  - Notification dans Home apres validation seance
  - Badge "Pret a progresser ?" sur les exos eligibles
  - Modal au prochain debut de seance avec accept/decline
- Si accept : modifier le programme local + persister DB
- Si decline : option "Re-essayer la meme charge" (deload implicite)

### Schema DB
```sql
CREATE TABLE IF NOT EXISTS progressive_overload_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  current_weight NUMERIC(6,2) NOT NULL,
  suggested_weight NUMERIC(6,2) NOT NULL,
  suggested_reps INT,
  reasoning TEXT,
  status TEXT DEFAULT 'pending', -- pending | accepted | declined | applied
  triggered_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  session_id_origin UUID -- la seance qui a declenche la suggestion
);

CREATE INDEX idx_overload_user_status ON progressive_overload_suggestions(user_id, status);

ALTER TABLE progressive_overload_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own suggestions" ON progressive_overload_suggestions
  FOR ALL TO authenticated USING (auth.uid() = user_id);
```

### Endpoint IA
- Nouvelle route : POST /api/suggest-overload
- Auth check (deja standard)
- Gate via canUseAI (refuse si invite)
- Input : { exerciseName, currentWeight, lastSessions: [...] }
- Output : { suggestedWeight, suggestedReps, reasoning }
- Prompt Claude :
  "Tu es un coach fitness. Voici l'historique des 4 dernieres seances
  pour {exercise} : {data}. Le client a fait {sets}x{reps}@{weight}kg
  toutes reussies. Suggere la prochaine charge en respectant :
  - +2.5kg max pour exos isolation
  - +5kg max pour exos composes lourds (squat, bench, deadlift)
  - +1.25kg pour exos petits muscles (curl, lateral raise)
  - Adapter selon RPE si dispo
  Reponds en JSON : {weight: number, reps: number, reasoning: string}"

### Composants
- `useOverloadSuggestion(userId)` : hook qui fetch suggestions pending
- `OverloadBanner` : bandeau Home si suggestion pending
- `OverloadModal` : modal au debut de seance avec accept/decline
- Logique dans `WorkoutSession.tsx` : detection fin de seance + appel API

### Tests manuels priorites
1. Solo client fait 4x10@60kg avec succes → suggestion apparait ?
2. Solo client echoue 1 serie → pas de suggestion ?
3. Invite client fait 4x10@60kg → pas de suggestion (gate par canUseAI) ?
4. Accept suggestion → prochaine seance affiche le nouveau poids ?
5. Decline suggestion → deload propose au lieu de reessayer ?

### Estimation : 2-3h
### Risque : Moyen (premier endpoint IA contextuel + nouvelle UX flow)

## Patterns techniques valides
- useIsMobile (app/hooks/useIsMobile.ts) : matchMedia 640px breakpoint
- Inline edit (Pencil + Check + X) > Modal pour champs simples
- IDs stables (name-based) pour dnd-kit
- State frais via setPDays(prev => ...) pour eviter closures stales
- safe-area-inset-bottom pour iPhones avec encoche
- touchAction: 'none' pour drag-drop tactile
- Selecteur jour mobile (mini-buttons + ChevronLeft/Right) pour grilles 7+ cols
