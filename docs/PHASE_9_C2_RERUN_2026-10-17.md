# Phase 9 — qualification du run C2 du 17 octobre 2026

Le run GitHub Actions [38967205063](https://github.com/bobitosm-prog/plateforme-coach/actions/runs/38967205063) a échoué lors de sa première tentative sur le SHA applicatif `38c2a609ee1fbe1b5014f8074aa2a5400779e2fe`. Les gates A, B et C1 ont réussi. La gate C2 a validé 14 parcours critiques sur 15 ; le parcours Checkout plateforme a rencontré un conflit de port du faux serveur Stripe (`EADDRINUSE`, port 55326). Le même parcours a réussi localement sur ce SHA. L'échec initial est qualifié `INFRASTRUCTURE`, sans effacer le FAIL primaire.

La tentative 2 a été relancée sur le **même run et le même SHA**, sans modification de code, de fixture ou de configuration observée. Son artefact immuable `ci-stability-observation-38967205063-attempt-2` (ID `12097802037`) indique :

| Champ | Valeur |
| --- | --- |
| `result` | `PASS` |
| `rerun_of` | `github-38967205063-attempt-1` |
| `gates.A/B/C1/C2` | `PASS/PASS/PASS/PASS` |
| `retry_masked` | `false` |
| `duration_ms` | `1012000` |

Ce rerun confirme le caractère intermittent de l'échec C2 pour ce run. Selon le contrat Phase 9, la tentative 2 ne constitue **pas** une observation primaire supplémentaire et ne remplace pas l'échec initial. L'import dans le registre append-only et la classification statistique restent soumis à la revue de toutes les observations admissibles.

Le contrôle local du registre courant indique 20 runs complets sur 4 jours UTC, dont 8 PASS et 12 FAIL. La cible reste au moins 150 runs primaires sur 7 jours UTC, p95 strictement inférieur à 20 minutes, taux flaky strictement inférieur à 2 %, et zéro échec non résolu ou inconnu. Le statut demeure `CI_STABILITY_CANDIDATE` ; ce seul rerun ne permet pas de déclarer `CI_STABLE` ni `STAGING_READY`.
