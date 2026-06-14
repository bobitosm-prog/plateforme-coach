# Fix timer rest PWA iOS - PENDING

## Etat
Branche : fix/workout-timer-datenow (non merge, push)

2 commits :
- fix: rest timer uses Date.now() to survive backgrounding
- fix: force rest timer recalc on visibility change

## Ce qui marche
- elapsed timer deja OK avec Date.now() - t0
- rest timer utilise restEndsAtRef + setInterval(200ms) qui recalcule
- visibilitychange + focus listeners ajoutes

## Ce qui ne marche pas (test 26 avril soir)
Sur Safari iPhone, apres lock 30s :
- Timer reste bloque a sa valeur d'avant lock au unlock
- Decompte ensuite normalement

## Hypotheses
1. visibilitychange tire pas immediatement au unlock iPhone
2. Tester pageshow event aussi
3. Tester setTimeout(tick, 100) au visibilitychange pour delai
4. Tester en PWA installee (vs Safari nav normal)

## Plan reprise
1. git checkout fix/workout-timer-datenow
2. Ajouter logs runtime sur visibilitychange/focus/pageshow
3. Test avec console
4. Identifier le bon event
5. Adapter
6. Test
7. Merge
