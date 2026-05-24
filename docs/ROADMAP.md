# MoovX Roadmap

> Document vivant — état au 2026-05-23 22:00
> Branche : `main` (clean, à jour avec origin)

## Sprint Launch Prep — STATUS

| Phase | Status | Notes |
|-------|--------|-------|
| Split host-based | ✅ Done | Mergé |
| RLS audit | ✅ Done | Mergé |
| Delete account RPC RGPD | ✅ Done | Mergé |
| Bug Celebration (récap V3) | ✅ Done | Mergé |
| Auth signup confirmation banner | ✅ Done | Prod validé |
| Email infra Infomaniak + DKIM | ✅ Done | 3/6 templates premium |

## Sprint P2 — Training Improvements

### Phase A — Tempo prescrit affichage premium
- **Status** : ✅ DONE — en production
- Pill gold + modal pédagogique 3 phases
- Bug latent fix bonus : `get-today-session.ts` (préservation tous champs exo)

### Phase B — Minuteur exec piloté par tempo
- **Status** : ✅ DONE (B.1 + B.2 + B.4.1 + B.4.2) — en production
- Bouton PLAY gold sur 1er set non-done
- Modal plein écran focus total avec countdown phase par phase
- Audio + vibration différenciées par phase (Android/desktop, neutre iOS)
- iOS background recovery propre (modal "TEMPO INTERROMPU")
- Fix bug audio rest timer en bonus (sons schedulés qui sonnaient post-skip)

### Phase B — Reportées (à évaluer après usage réel)
- **B.3** — Bridge auto vers rest timer après tempo : ❌ NON RETENU (décision UX finale)
- **B.4.3** — Countdown 3-2-1 GO avant rep 1 : ⏳ À évaluer si feedback usage le réclame
- **B.4.4** — Animations cosmétiques transitions : ⏳ À évaluer si feedback usage

### Phase C — Swipe navigation
- **Status** : ⏳ TODO
- **Effort estimé** : 3-4h
- **Position senior** : préférer stepper "Exo 2/6 ← →" plutôt que swipe horizontal (conflit scroll vertical iOS)

## Backlog bugs (priorité non urgente)

1. Dashboard "VOIR LA SEANCE" → redirige Analytics (devrait ouvrir détail session)
2. Désync scheduled_sessions vs dashboard display
3. CustomBuilder ne permet pas saisie tempo (feature manquante)
4. Templates emails restants à premiumiser : invite user, change email, reauthentication
5. `addRestTime` (+30s) ne re-schedule pas les sons (bip arrive trop tôt si on étend le repos) — mineur

## Tech debt notable

- WorkoutSession.tsx = 1500+ lignes monobloc (split à terme, hors priorité)
- Décision tempo "afficher toujours même 2-0-2" à réévaluer après feedback usage réel

## Idées feedback usage réel (à observer)

Avec Phase A + B en prod, à surveiller sur les prochaines séances :
- Le countdown 3-2-1 manque-t-il vraiment ? (B.4.3 candidate)
- Les animations cosmétiques améliorent-elles l'engagement ? (B.4.4 candidate)
- L'user oublie-t-il de cliquer PLAY ? (besoin d'un nudge ?)
- Le bouton PAUSE est-il utilisé ? (sinon le simplifier)
- Les vibrations différenciées sont-elles perceptibles à l'usage ?

## Stack & déploiement

- Repo : github.com/bobitosm-prog/plateforme-coach
- Production : app.moovx.ch (Vercel auto-deploy main)
- Landing : moovx.ch
- DB : Supabase project njlzossopgknanhkzcbk
- Email : Infomaniak SMTP (noreply@moovx.ch)
