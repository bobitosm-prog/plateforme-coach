# Roadmap — Admin Console MoovX

## Livre (14 mai 2026)

### Backend
- API users (list / patch role / patch subscription) + bypass RLS via service_role
- API Stripe (stats avec MRR + balance_transactions, payments enrichis)
- API logs (app_logs filtre par action)
- Audit trail dans `app_logs` a chaque mutation admin
- Helper `verifyAdmin` (Bearer + email) + `handleAdminAuthError`

### UI
- Shell admin : sidebar 240px brand (logo MOOVX + ADMIN, user card initiales)
- 4 pages : Overview / Comptes / Revenue / Logs
- KPI cards value-first avec Bebas Neue
- Tables avec search + filtres + actions hover
- 2 dialogs : RoleDialog + SubscriptionDialog (optimistic UI)
- Graphique area 12 mois (brut + net Stripe avec tooltip custom)
- Design system aligne Coach Pro (gold #d4a843, polices brand, uppercase labels)

## En attente de validation (commit 5989bf8)
- Polish visuel KPI cards + tables + toolbars
- Section headers gold visibles
- Padding tables agrandi, plus de colonnes coupees

## Backlog priorise

### P1 — UX critique
- [ ] Bouton "Inviter un user" depuis /admin/users (avec form email + role par defaut)
- [ ] Detail user en drawer lateral (au lieu de modal) avec timeline activite + paiements
- [ ] Confirmation "type to confirm" pour actions destructives (delete)
- [ ] Bouton "Refresh" manuel sur chaque page (icone rotate top-right)

### P2 — Data & exports
- [ ] Export CSV de la table users
- [ ] Export CSV des paiements (avec frais Stripe par ligne)
- [ ] Tracker MRR historique : snapshot mensuel dans table dediee
- [ ] Page `/admin/coach/[id]` detaillee (commissions, clients, paiements percus)

### P3 — Productivite admin
- [ ] Cmd+K command palette (recherche globale + actions rapides)
- [ ] Bulk actions sur table users (selection multi-lignes)
- [ ] Filtre date sur les logs (today / 7j / 30j / custom)
- [ ] Notifications real-time (Supabase realtime) pour nouveaux paiements

### P4 — Tech debt (separee mission admin)
- [ ] Migrer les 21 fichiers `createBrowserClient` inline → `import { supabase }`
- [ ] Pre-insert payment au checkout : nettoyer les `pending` orphelins si webhook fail
- [ ] Renewal `invoice.payment_succeeded` : ajouter `coach_id` pour attribution coach
- [ ] `SUBSCRIPTION_PRICE_CHF = 30` dans constants.ts : dead code a supprimer/aligner sur prix reels
- [ ] Webhook : tracer aussi `payment_intent.payment_failed`
- [ ] Tailwind 4 : auditer toutes les arbitrary values `[xxx]` non-rendues
- [ ] Git identity warning (config user.name + user.email)

### P5 — Polish design (en cours)
- [ ] Comparer visuellement avec coach.tsx, ajuster densite finale
- [ ] Validation responsive mobile sur toutes les pages admin
- [ ] Empty states avec illustrations (pas juste texte)
- [ ] Skeleton loaders plus subtils (shimmer gold)
- [ ] Toasts position bottom-right au lieu de top-right ?
