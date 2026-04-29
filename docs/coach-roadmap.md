# Coach Perfect Roadmap

## Vision
"Coach parfait" = l'app que Marco/d'autres coaches voudraient utiliser 
quotidiennement pour gerer leurs clients sans frustration.

## ✅ Deja fait (avant 30 avril 2026)
- Templates CRUD
- Assign avec status visible
- Resync depuis template
- Push global aux clients
- Edit programme assigne
- Toasts coherents
- ConfirmDialog design tokens
- ClientProgress 4 sections (poids, mesures, photos, sessions)
- Voir derniere seance + compteur hebdo

## ⏳ Sprint 1 — Templates + UX editeur (3-4h)

### Templates puissants
- [ ] Tags / categories sur templates (Force, Hypertrophie, Cut, etc)
- [ ] Recherche filtree dans la liste templates
- [ ] Variantes : creer un template a partir d'un autre (clone + edit)
- [ ] Bibliotheque de templates pre-faits (PPL, Upper/Lower, Full Body)

### UX editeur programme
- [ ] Drag-drop sets dans un exercice (reorder)
- [ ] Drag-drop exercices dans un jour (reorder)
- [ ] Copier un jour entier vers un autre jour
- [ ] Dupliquer un exercice avec modification
- [ ] Vue compacte vs detaillee (toggle)

## ⏳ Sprint 2 — Page client enrichie (3-4h)

### Page dedicacee timeline complete
- [ ] Timeline chronologique : seances + mesures + photos + messages
- [ ] Filtres par type d'evenement
- [ ] Vue mois / trimestre / annee

### Stats avancees par client
- [ ] Graphique evolution poids (deja la, a enrichir)
- [ ] Graphique evolution volume hebdomadaire
- [ ] Graphique top exercices (plus pratiques)
- [ ] PR records visibles (1RM estime + progression)
- [ ] Frequence d'entrainement (heatmap calendrier)
- [ ] Comparaison vs objectif initial

## ⏳ Sprint 3 — Communication + nutrition (4-6h)

### Messages chat in-app
- [ ] Table messages (sender, recipient, content, read_at)
- [ ] UI conversation type Whatsapp
- [ ] Notification "nouveau message" sur Home coach + client
- [ ] Realtime via Supabase Realtime channel
- [ ] Badge non-lus

### Plan nutritionnel
- [ ] Table nutrition_plans (client_id, calories, macros, meals)
- [ ] Editeur de plan cote coach
- [ ] Vue cote client (onglet Nutrition existant a remplir)
- [ ] Templates de plans nutritionnels (cut/bulk/maintenance)
- [ ] Tracking quotidien client (optionnel)

## ⏳ Sprint 4 — Dashboard analytics (3-4h)

### Analytics global coach
- [ ] CA mensuel / annuel
- [ ] Retention (clients actifs vs inactifs)
- [ ] Top exos utilises tous clients confondus
- [ ] Frequence moyenne entrainement par client
- [ ] Alertes : clients qui n'ont pas fait de seance depuis X jours
- [ ] Alertes : clients qui n'ont pas envoye de mesure depuis X jours

## Methodologie
- 1 sprint = 1 session de 2-4h
- 1 branche par feature
- Diff brut avant chaque commit
- Test sur preview avant merge
- Documentation au fil de l'eau

## Priorite
Sprint 1 et 2 d'abord (impact quotidien direct sur le coach).
Sprint 3 et 4 quand le produit a des utilisateurs reels.

