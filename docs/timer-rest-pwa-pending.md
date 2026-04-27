# Fix timer rest PWA iOS - PENDING

## Etat
Branche : fix/workout-timer-datenow (non merge, push)

2 commits sur la branche :
- fix: rest timer uses Date.now() to survive backgrounding
- fix: force rest timer recalc on visibility change

## Ce qui marche
- Le elapsed timer (chrono seance total) etait deja OK avec Date.now() - t0
- Le rest timer utilise maintenant Date.now() + restEndsAtRef au lieu d'un compteur
- visibilitychange + focus listeners forcent un recalcul au retour de visibilite

## Ce qui ne marche TOUJOURS pas (test 26 avril 2026 soir)
- Sur Safari iPhone (en navigateur normal, pas PWA), apres lock 30s :
- Le timer reste bloque a sa valeur d'avant lock (75s -> 75s) au unlock
- Continue ensuite a decompter normalement

## Hypotheses pour la prochaine session
1. visibilitychange ne tire peut-etre pas immediatement au unlock iPhone
   -> Tester avec 'pageshow' event aussi
2. Le focus event ne tire peut-etre pas non plus
   -> Logger ces events au runtime pour confirmer
3. Safari iOS a peut-etre un delai de re-render apres unlock
   -> Tester avec setTimeout(tick, 100) au visibilitychange
4. Tester en PWA installee (peut-etre comportement different vs Safari)

## Plan de reprise
1. git checkout fix/workout-timer-datenow
2. Ajouter logs runtime sur visibilitychange + focus + pageshow events
3. Test avec console ouverte
4. Identifier le vrai event qui tire au unlock
5. Adapter le code
6. Test final
7. Merge si OK
