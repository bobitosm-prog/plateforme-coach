# Coach Mobile Roadmap

## ✅ Sprint 1 mobile - CoachPrograms (29 avril 2026 matinee)
- isMobile state pattern (window.matchMedia 640px)
- Grids responsive (form 2->1, exo 3->2)
- Bottom nav 5 tabs (Accueil, Clients, Programmes, Messages, Agenda)
- Card template name + actions stack vertical
- paddingBottom calc(80px + safe-area-inset-bottom)
- Day header Dupliquer icon-only mobile
- Touch targets drag-drop 38px (Apple HIG)

## ✅ Sprint 2 mobile - Autres pages (29 avril 2026 soiree)
- Hook useIsMobile extrait (app/hooks/useIsMobile.ts)
- Refacto CoachPrograms pour utiliser le hook
- CoachProfile : grid 1col + tarif row stack
- CoachCalendar : titre 1.2rem + boutons Prev/Next icon-only
- CoachPage Home : fontSize revenue/messages + revenue selects stack
- ClientsList : header titre + search stack vertical

## ⏳ Sprint 3 mobile - Client (prochaine session, 1-2h)
- [ ] Bottom nav 5 tabs cote client (pattern valide)
- [ ] Page Training (timer, exos, sets)
- [ ] Page Mesures, Photos, Programme
- [ ] Modal et popups responsive

## Pattern technique valide

import { useIsMobile } from '../../hooks/useIsMobile'

export default function MyComponent() {
  const isMobile = useIsMobile()
  return (
    <div style={{
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      flexDirection: isMobile ? 'column' : 'row',
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      padding: isMobile ? 8 : 4,
    }}>...</div>
  )
}

## Bug recurrent surveille
Claude Code peut ajouter des liens markdown dans le RENDU du diff.
Verification : grep -c '\[propriete\]' fichier.tsx
Si 0 -> juste affichage Claude Code, fichier OK.
Si > 0 -> fix avec Node script.

## Hook reutilisable
app/hooks/useIsMobile.ts (23 lignes, SSR-safe, breakpoint configurable a 640px par defaut)
