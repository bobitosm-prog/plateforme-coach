# Refonte génération planning training

## Statut : design validé, implémentation par sous-batches (9 juin 2026)

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

## Découpage (commits isolés, bisect-friendly)
- F1  : buildWeekSessions(userId, weekStart, profile, program) lit le
        programme, fallback PPL_SCHEDULE. (lib/schedule-utils.ts)
- F1.5: activateProgram appelle buildWeekSessions, suppression génération
        inline dupliquée. (TrainingTab.tsx) — un seul générateur.
- F2  : hasProgram inclut custom programs ; passer programme actif à
        fetchScheduledSessions. (useClientDashboard + useScheduledSessions)
- F3  : isDone croise workout_sessions à la date. (TrainingTab L.876)
- F4  : régénération auto si semaine courante incomplète (pas seulement
        vide). (useScheduledSessions)
- F5  : backfill data marko.rosa (doublon 7 juin + semaine 8-14). SQL.

## Vigilance
- Mapping weekday/index (padTo7Days) = zone des bugs du 5 juin
  (DAY_NAME_MAP, mapping jour). Tester que les bons jours tombent aux
  bonnes dates.
- toDateStr TZ : utiliser partout, jamais toISOString.
- Reminders : ne pas casser reminder_enabled à la régénération.
- Validation E2E sur marko.rosa après F1-F4, AVANT backfill F5.
