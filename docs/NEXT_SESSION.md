# Démarrage prochaine session

## Contexte rapide

Dernière session : 31 mai 2026 (session 2 Phase 6B, 6 commits : F6.B.2 + F6.B.3 + F6.B.4 + F6.B.5a).
Voir docs/SESSION_LOG.md "2026-05-31" pour détail complet.

Etat au démarrage :
- main clean, 17 commits 30 mai + 6 commits 31 mai = 23 commits total Phase 6 en prod sur app.moovx.ch
- HEAD 74a4481
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B F6.B.0 (normalisation equipment) : DONE
- Phase 6B F6.B.1 (profile équipement + onboarding step 10) : DONE
- Phase 6B F6.B.2 (variant_group 100% couverture) : DONE
- Phase 6B F6.B.3 (helper buildProgramParams) : DONE
- Phase 6B F6.B.4 (refacto generate-custom-program tool_use) : DONE
- Phase 6B F6.B.5a (auto-gen post-onboarding) : DONE
- F6.B.3/4/5a DONE — chaîne core Training opérationnelle, auto-gen post-onboarding live
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit 74a4481 F6.B.5a-2.

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.5b auto-regen programme post-Apply diagnostic (~1h)

Équivalent F6.A.2 pour le training. Quand un user clique "Appliquer" sur un diagnostic hebdomadaire, auto-regénérer le programme training en plus du meal plan (déjà fait en F6.A.2). Utilise buildProgramParams avec ProgramOverrides (ex: training_volume_delta_pct du diagnostic).

Dépend de F6.B.3 (DONE) + F6.B.4 (DONE).

### Priorité 2 — F6.B.6 cron auto-regen 14j

Cron pg_cron qui régénère automatiquement le programme training tous les 14 jours (périodisation). Pattern similaire au cron weekly diagnostic.

### Priorité 3 — Consolidation variant_groups fragmentés (tech debt #10)

`good_morning` + `stiff` + `rdl` + `deadlift` = 4 groupes hip hinge distincts au lieu d'un. Idem fessiers (3 groupes), chest (6 groupes). Limite qualité substitution. À consolider.

## Si tu veux faire autre chose

### Tech debt résiduel (cosmétique ou non urgent)

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 11 items listés, certains <30 min.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.
