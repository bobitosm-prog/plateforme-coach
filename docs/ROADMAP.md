# MoovX Roadmap

> Document vivant — état au 2026-05-22 19:30
> Branches actives : `feat/tempo-modal-phase-a` (à merger)

## Sprint Launch Prep — STATUS

| Phase | Status | Notes |
|-------|--------|-------|
| Split host-based | ✅ Done | Mergé |
| RLS audit | ✅ Done | Mergé |
| Delete account RPC RGPD | ✅ Done | Mergé |
| Bug Celebration (récap V3) | ✅ Done | Mergé |
| Auth signup confirmation banner | ✅ Done | Commit 434d9bb mergé, test E2E à valider demain |
| Email infra Infomaniak + DKIM | ✅ Done | DNS validé, 3/6 templates premium |

## Sprint P2 — Training Improvements

### Phase A — Tempo prescrit affichage premium
- **Status** : ✅ Codé, branche poussée, **à merger demain matin après validation visuelle**
- Branch : `feat/tempo-modal-phase-a`
- Commits : cddf96c (fix latent) + 5284ed6 (feat Phase A)

### Phase B — Minuteur exec piloté par tempo
- **Status** : ⏳ TODO
- **Effort estimé** : 4-5h
- **Spec brève** :
  - Bouton "▶ Démarrer la rep" sur chaque set actif (visible seulement si tempo prescrit)
  - Compte à rebours visuel par phase : ECCENTRIC 3s → PAUSE 1s → CONCENTRIC 2s
  - Audio + vibration à chaque transition (réutilise `playBeep`, `vibrateDevice` existants)
  - Loop auto pour les N reps prescrites
  - Pause/resume/skip
- **Position senior** : minuteur exec uniquement piloté par tempo (pas de chrono libre), sinon contre-productif en muscu

### Phase C — Swipe navigation
- **Status** : ⏳ TODO
- **Effort estimé** : 3-4h
- **Position senior** : préférer un stepper haut de page ("Exo 2/6 ← →") plutôt que swipe horizontal (conflit avec scroll vertical iOS)
- Si vraiment swipe : limiter à la bannière hero de chaque exo, pas sur la liste de sets

## Backlog bugs (priorité non urgente)

1. Dashboard "VOIR LA SEANCE" → redirige Analytics (devrait ouvrir détail session)
2. Désync scheduled_sessions vs dashboard display
3. CustomBuilder ne permet pas saisie tempo (feature manquante)
4. Templates emails restants à premiumiser : invite user, change email, reauthentication

## Tech debt notable

- WorkoutSession.tsx = 1457 lignes monobloc (split à terme, hors priorité)
- Décision tempo "afficher toujours même 2-0-2" à réévaluer après feedback usage réel

## Stack & deploiement

- Repo : github.com/bobitosm-prog/plateforme-coach
- Production : app.moovx.ch (Vercel auto-deploy main)
- Landing : moovx.ch
- DB : Supabase project njlzossopgknanhkzcbk
- Email : Infomaniak SMTP (noreply@moovx.ch)
