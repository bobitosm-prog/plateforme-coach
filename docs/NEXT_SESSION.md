# Démarrage prochaine session

## Contexte rapide

Dernière session : 31 mai 2026 (session 2 Phase 6B, 8 commits : F6.B.2 + F6.B.3 + F6.B.4 + F6.B.5a + F6.B.5b + docs).
Voir docs/SESSION_LOG.md "2026-05-31" pour détail complet.

Etat au démarrage :
- main clean, 17 commits 30 mai + 8 commits 31 mai = 25 commits total Phase 6 en prod sur app.moovx.ch
- HEAD d7b9a6b
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B F6.B.0 (normalisation equipment) : DONE
- Phase 6B F6.B.1 (profile équipement + onboarding step 10) : DONE
- Phase 6B F6.B.2 (variant_group 100% couverture) : DONE
- Phase 6B F6.B.3 (helper buildProgramParams) : DONE
- Phase 6B F6.B.4 (refacto generate-custom-program tool_use) : DONE
- Phase 6B F6.B.5a (auto-gen post-onboarding) : DONE
- Phase 6B F6.B.5b (auto-regen post-Apply diagnostic) : DONE
- F6.B.5b DONE — closed-loop training quasi complet (génération onboarding + regen diagnostic)
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit d7b9a6b F6.B.5b.

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.6 cron auto-regen 14j (dernier morceau Phase 6B Training)

Cron pg_cron qui régénère automatiquement le programme training tous les 14 jours (périodisation). Pattern similaire au cron weekly diagnostic. Dernier morceau pour boucler Phase 6B.

### Priorité 2 — Consolidation variant_groups fragmentés (tech debt #10)

`good_morning` + `stiff` + `rdl` + `deadlift` = 4 groupes hip hinge distincts au lieu d'un. Idem fessiers (3 groupes), chest (6 groupes). Limite qualité substitution. À consolider.

### Priorité 3 — Tech debt résiduels

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 11 items listés, certains <30 min.

## Si tu veux faire autre chose

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.
