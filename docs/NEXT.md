Prochaine session
Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.
Cap immédiat : Horizon 1 — Launch beta Genève
Voir ROADMAP.md. Phase A (BLINDER avant la pub).
Phase A — avancement
	•	[x] Vercel Pro (légal + maxDuration 300s effectifs) ✅ 14 juin
	•	[x] Mécanisme beta gratuit — système de campagnes (briques 1-4) ✅ 14 juin
	•	[ ] Brique 5 : UI admin campagnes (créer/activer/voir compteur sans SQL)
	•	[ ] Parcours signup→onboarding→1ère séance validé E2E par un tiers
	•	[ ] Observabilité minimale (app_logs fiable)
Prochaines tâches (par priorité)
1. Cron streak — refonte logique (CHANTIER, à tête reposée)
Le cron fonctionne techniquement mais la logique métier est inadaptée (notifie seulement streak≥3 = rétention). Besoin réel : rappeler "séance prévue aujourd'hui non faite" pour tous.
	•	Recette dans SESSION_LOG (14 juin) : charger custom_programs actif → getSessionForDay(programDays, getTodayIndex()) → si 'rest' skip → si 'workout'
	◦	pas de séance complétée aujourd'hui → envoyer. Message adapté selon streak.
	•	Remplacer route.ts ligne 108 (le seuil !atRisk || current<3).
	•	Sous-question : computeStreak doit-il ignorer les jours de repos planifiés ? (fort impact, à penser séparément).
	•	AUSSI : corriger le bug des 2 crons actifs (jobid 8 ET 9 → double exécution en été).
2. FAILLE SÉCURITÉ RLS profiles (P0 avant launch)
Policies update profiles = with_check=null → un user peut s'auto-poser subscription_type='lifetime'. Restreindre les colonnes modifiables (trigger ou policy bloquant subscription_*). Nettoyer le doublon de policy au passage.
3. Fix UX onboarding "10 jours" trompeur
L'écran final affiche "10 jours d'essai" même à un beta (qui a 60j). Adapter le texte selon le résultat du claim_beta_slot.
4. Brique 5 — UI admin campagnes beta
Page admin : créer une campagne (nom, free_days, max_slots), activer/désactiver, voir compteur places prises/restantes. Réutiliser patterns admin (SubscriptionDialog).
Backlog (voir ROADMAP)
#18 nutrition = RÉSOLU. Reste P1 : Bloc D cohérence schéma↔code, exercise_id FK, validation total_weeks.
Notes
	•	Compte test marco.ferreira@vapo-premium.ch = en beta (volontaire, test).
	•	Marko : streak_current=0, jamais touché aujourd'hui. Pour tester un rappel, il faudrait lui fabriquer un historique de séances + une séance prévue aujourd'hui.

