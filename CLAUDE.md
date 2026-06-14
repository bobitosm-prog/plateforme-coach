# MOOVX - Instructions Claude Code

## Rituel de fin de session (OBLIGATOIRE)

À chaque fin de session, dans l'ordre :
1. **SESSION_LOG.md** : append ce qui a été fait (date, commits, cause/fix/leçon). Append-only, ne jamais effacer.
2. **ROADMAP.md** : cocher ce qui est fait, re-prioriser le backlog.
3. **NEXT.md** : réécrire les 3-5 prochaines tâches concrètes + l'impératif du moment.
4. **CLAUDE.md** : MAJ uniquement si conventions/archi/stack ont changé.

## Règle anti-dérive (apprise le 14 juin)
Les docs reflètent `main`, pas l'inverse. Si un doc (pending, roadmap) contredit
le code, **le code gagne** — vérifier l'état réel par grep/audit AVANT de planifier
un fix. Plusieurs heures perdues sur des docs périmés (bugs déjà résolus mais
pending non fermés : timer, swipe, persistance séance).

## Docs vivants (les seuls à jour)
- ROADMAP.md — cap 3 horizons + état + backlog priorisé
- NEXT.md — prochaines tâches
- SESSION_LOG.md — historique append-only
- CLAUDE.md — ce fichier (contexte projet)
Tout le reste est dans docs/archive/ (historique, ne pas s'y fier pour l'état courant).

## Frontend Design Skill
Whenever building or styling UI, follow the guidelines in .claude/skills/frontend-design.md

## Stack
React, Tailwind CSS, TypeScript, Supabase

## Brand
- Palette: noir, or/gold (#D4AF37), blanc
- Direction: Swiss Precision × Athletic Editorial
- Mobile-first

## Comment travailler avec Marco

Marco Ferreira, fondateur et dev unique de MoovX. Communication
en français. Niveau technique intermédiaire : sait lire/écrire
du code, comprend les concepts senior, apprécie les explications
pédagogiques étape par étape.

### Style de réponse attendu

- Pédagogique étape par étape : décortiquer le raisonnement avant
  de proposer une solution. Marco veut comprendre, pas exécuter
  aveuglément.
- Argumenté : toute décision technique doit être justifiée (pourquoi
  A plutôt que B, quels trade-offs).
- Concis quand demandé : code prêt à tester, sans bla-bla.
- Honnête : si une approche est mauvaise, le dire. Si Marco se
  trompe, expliquer et corriger.
- Pas de flatterie ("excellente question"). Direct au sujet.
- Stop si Marco dit stop ou montre des signes de fatigue.

### Workflow standard

1. Diagnostic d'abord (lecture fichiers, query DB)
2. Spec/design avant code
3. ask_user_input_v0 pour décisions structurantes (UI/UX, archi)
4. Générer prompts Claude Code précis (pas d'écriture directe)
5. Tests : SQL pur, puis E2E sur compte test, puis prod iPhone
6. Commits avec message détaillé (contexte, cause, solution, learnings)
7. Documentation SESSION_LOG + ROADMAP en fin de session

## État courant
L'état du projet, le cap et le backlog vivent dans ROADMAP.md et NEXT.md.
Ne PAS dupliquer l'état ici — il périme (leçon 14 juin).

## Patterns techniques (DO)

### Supabase

- RPC SECURITY DEFINER pour cross-table operations qui doivent
  bypass RLS de façon contrôlée
- Safety check obligatoire dans le RPC :
```sql
  IF auth.uid() IS NULL OR (auth.uid() != target_user_id AND
     (SELECT role FROM profiles WHERE id = auth.uid()) != 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: ...' USING ERRCODE = '42501';
  END IF;
```
- Dollar quoting tagué : `$func$ ... $func$;`, JAMAIS `$` simple
  (Supabase SQL Editor tronque sinon)
- Appeler RPC via le client authentifié (cookie-aware,
  supabaseAuth.rpc), PAS via service_role, sinon auth.uid()
  retourne NULL
- Inventaire FK via information_schema pour cascade deletes,
  JAMAIS de liste à la main

### Auth & sessions

- Toute opération qui supprime un user doit être suivie de
  `await supabase.auth.signOut()` côté browser AVANT le redirect,
  sinon le cookie JWT survit → état zombie (user logged sur compte
  fantôme).
- Middleware proxy gère le host-based routing. Ne pas le contourner.

### Design system

- TOUJOURS chercher un token existant dans `lib/design-tokens.ts`
  avant de créer un style inline
- Tokens clés : cardStyle, titleStyle, titleLineStyle, cardTitleAbove,
  statStyle, statSmallStyle, mutedStyle, badgeStyle, btnPrimary,
  pageTitleStyle, subtitleStyle, labelStyle, bodyStyle
- Pattern MoovX : titre tiny GOLD letter-spaced (titleStyle) AU-DESSUS
  de la card, avec ligne décorative à côté (titleLineStyle). PAS de
  titre dans la card.

### Tests

- SQL pur dans Supabase SQL Editor AVANT de coder côté TS
- 3 tests min pour un RPC : existence/signature, sécurité (usurpation),
  query réelle avec data
- E2E sur compte test en prod après deploy
- Mobile iPhone = la vraie cible, pas desktop

### Commits

- Messages multi-lignes détaillés : contexte, cause, solution,
  apprentissage senior
- Préfixes : feat, fix, chore, docs, refactor
- Apprentissages à la fin du message pour traçabilité

## Anti-patterns (NEVER)

- ❌ Ne JAMAIS appeler supabase.rpc() via service_role quand le RPC
  utilise auth.uid() — toujours via supabaseAuth.rpc()
- ❌ Ne JAMAIS faire window.location.href = '/login' après deletion
  sans supabase.auth.signOut() AVANT
- ❌ Ne JAMAIS utiliser $ simple dans les migrations Supabase
- ❌ Ne JAMAIS réinventer un style inline si un token existe dans
  lib/design-tokens.ts
- ❌ Ne JAMAIS utiliser max-w-md ou autre Tailwind max-width sur un
  wrapper layout critique (fixed/absolute) — préférer inline style
  { maxWidth: 512, marginLeft: auto, marginRight: auto } (Tailwind
  unreliable sur ces wrappers)
- ❌ Ne JAMAIS afficher d'icône Trophy/Award sur écrans premium
  (Apple/Whoop/Strava évitent)
- ❌ Ne JAMAIS suggérer un design éditorial magazine sans cards sur
  mobile (Marco a refusé, illisible sur iPhone)
- ❌ Ne JAMAIS push directement sans rappel des tests E2E pour code
  critique (auth, payments, deletion)
- ❌ Ne JAMAIS flatter Marco. Direct au sujet.
- ❌ Ne JAMAIS exposer les credentials des comptes test en code,
  commits, doc

## Pièges techniques connus

### Le piège dquote zsh

Le `git commit -m "..."` peut bloquer en mode `dquote>` si le message
contient des apostrophes ou caractères spéciaux. Solution :

```bash
cat > /tmp/commit_msg.txt << 'COMMIT_END'
type(scope): titre court

Description détaillée multi-lignes.
COMMIT_END

git commit -F /tmp/commit_msg.txt
```

Si bloqué en dquote : `Ctrl+C` annule sans casser le staging.

### Tailwind max-width sur fixed/absolute

`max-w-md mx-auto` ne fonctionne pas comme attendu sur un parent
`fixed inset-0`. Préférer inline style explicite :
```tsx
style={{ maxWidth: 512, marginLeft: 'auto', marginRight: 'auto', paddingLeft: 20, paddingRight: 20 }}
```

## Comptes & accès

### Identité Git
- Auteur : Marco Ferreira <bobitosm@gmail.com>

### Comptes test

Des comptes test existent en DB (clients + coach). Marco les utilise
pour E2E. **NE JAMAIS exposer leurs emails/UUIDs dans code, commits
ou doc**. Si Claude a besoin pour un exemple, demander à Marco en
privé.

### Comptes payants
0 actuellement. App en pré-launch.

## Liens utiles

- Repository : https://github.com/bobitosm-prog/plateforme-coach
- App prod : https://app.moovx.ch
- Landing : https://moovx.ch
- Supabase Dashboard : project njlzossopgknanhkzcb (CoachPlatform)
- Stripe : LIVE mode (production)

## Skills disponibles

- `.claude/skills/frontend-design.md` : philosophie design (BOLD,
  distinctif, anti-AI-slop)
- `.claude/skills/ui-ux-pro-max/SKILL.md` : arsenal complet
  searchable (67 styles, 96 palettes, 57 fonts, 99 UX rules)
- `docs/SESSION_LOG.md` : état dynamique du projet + log chronologique

---

**Dernière mise à jour** : 2026-05-22
