# Refonte génération planning training

## Statut : LIVRÉ — tous les batches F1→F5 déployés (10 juin 2026)

## Contexte
Bug terrain (compte test marko.rosa) : séance Push faite lundi 8 juin
affichée "MANQUÉE" au calendrier. Diagnostic a révélé 3 bugs structurels
dans le module de planning, pas un simple bug d'affichage.

## Les 3 bugs
1. B-gen : buildWeekSessions (lib/schedule-utils.ts) génère depuis une
   constante PPL_SCHEDULE hardcodée (Pectoraux/Dos/Jambes générique),
   ignore activeProgram.days. activateProgram (TrainingTab) utilise lui
   padTo7Days(activeProgram.days) -> DEUX générateurs divergents.
2. B-hasProgram : fetchScheduledSessions reçoit hasProgram = !!coachProgData
   (useClientDashboard L.220) -> ignore les programmes custom SOLO ->
   auto-génération jamais déclenchée pour les users SOLO -> semaines vides.
3. B-matching : calendrier (TrainingTab L.876) calcule isDone/isMissed sur
   ws.completed (scheduled_sessions) seul, ignore workout_sessions. Une
   séance réellement faite sans ligne scheduled_sessions = comptée manquée.

## Cible architecturale
- scheduled_sessions = source de vérité de la PLANIFICATION (dates, reminders).
- buildWeekSessions lit le vrai programme (padTo7Days(program.days)),
  PPL_SCHEDULE devient fallback si aucun programme actif.
- Statut "fait" dérivé de la réalité : completed=true OU workout_sessions
  completed=true à cette date.
- Auto-gen déclenchée pour tout programme actif (custom OU coach).
- UN seul générateur (activateProgram pointe vers buildWeekSessions).

## Découpage (commits isolés, bisect-friendly) — TOUS LIVRÉS (10 juin 2026)
- F1   (5cf2979) : buildWeekSessions lit le vrai programme, fallback PPL. DONE
- F1.5 (c42f818) : activateProgram délègue à buildWeekSessions. DONE
- F2   (4a5833f) : hasProgram custom+coach, programme branché au fetch
       (helper coachToDays, custom_programs au Promise.all). DONE
- F3   (3d5538c) : isDone croise workout_sessions via doneDates (w.date,
       jamais created_at -> TZ-safe). DONE
- F4   (b740c49) : gap-fill idempotent clé date|type sur les 3 chemins
       (fetch, regenerate, activate). Jamais de delete des complétées. DONE
- F4-cache (c26dfb2) : le chemin cache-hit (sessionStorage TTL 5min)
       rafraîchit les scheduled_sessions (avant : return sans fetch). DONE
- F4d  (d854bc9) : HeroSessionCard alignée sur doneDates (remonté au
       scope composant). DONE
- F5   (SQL direct, pas de commit) : doublon LEGS QUADS du 7 juin supprimé
       (ligne completed=false résiduelle). Données marko.rosa propres. DONE

## Dettes consignées (hors scope, à reprendre un jour)
- weekSessions (TrainingTab L.197) dérive du programme quand
  activeCustomProgram existe, scheduledSessions à défaut : demi-source de
  vérité héritée. Fonctionne avec doneDates, à unifier.
- "Régénérer" sans aucun programme -> fallback PPL générique (comportement
  historique conservé).
- Changement de semaine réel (lundi 15) : le gap-fill générera la nouvelle
  semaine au premier chargement — mécanisme testé par trou artificiel,
  à confirmer en conditions réelles lundi prochain.

## Vigilance
- Mapping weekday/index (padTo7Days) = zone des bugs du 5 juin
  (DAY_NAME_MAP, mapping jour). Tester que les bons jours tombent aux
  bonnes dates.
- toDateStr TZ : utiliser partout, jamais toISOString.
- Reminders : ne pas casser reminder_enabled à la régénération.
- Validation E2E sur marko.rosa après F1-F4, AVANT backfill F5.
