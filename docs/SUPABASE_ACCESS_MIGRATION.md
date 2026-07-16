# Migration représentative des accès Supabase

Cette tranche Phase 2 migre exactement dix sites applicatifs afin de valider les factories et repositories canoniques sans lancer une conversion générale. Un site désigne ici une construction de client et l'opération locale qu'elle alimente dans un fichier applicatif distinct.

## Périmètre sélectionné

| # | Site applicatif | Contexte et opération préservée | Ancienne frontière | Nouvelle frontière | Risque et couverture |
|---:|---|---|---|---|---|
| 1 | `app/login/LoginPageContent.tsx` | Browser, authentification et lecture du rôle après login | `createBrowserClient` local | `getSupabaseBrowserClient` | Moyen; contrats login/invitation et E2E invitation |
| 2 | `app/register-client/RegisterClientContent.tsx` | Browser, inscription et mise à jour du profil synthétique | `createBrowserClient` local | singleton browser + `TablesUpdate<'profiles'>` | Moyen; contrat de cutover et E2E invitation |
| 3 | `app/components/BugReport.tsx` | Browser, insertion et historique des feedbacks | `createBrowserClient` global | singleton browser | Faible; compatibilité statique et suite complète |
| 4 | `app/join/JoinPageContent.tsx` | Browser, session après validation d'invitation | `createBrowserClient` dans le composant | singleton browser | Moyen; tests hostiles/cutover et E2E invitation |
| 5 | `app/api/user/sync-locale/route.ts` | Server, identité de session et lecture de locale | client SSR recopié + lecture `profiles` directe | server factory + identity/profile repositories | Faible; tests route absent/erreur/succès |
| 6 | `app/api/user/locale/route.ts` | Server, identité de session et écriture `preferred_locale` | client SSR recopié + update direct | server factory + identity repository + `updateSafe` | Moyen; tests autorisation, mutation et erreur expurgée |
| 7 | `app/api/log-error/route.ts` | Server, identité optionnelle et insertion RLS `app_logs` | client SSR recopié + `auth.getUser` local | server factory + identity repository; insertion typée directe | Faible; test anti-usurpation de l'identité |
| 8 | `app/api/ai-quota/route.ts` | Server, identité avant lecture du quota | client SSR recopié + `auth.getUser` local | server factory + identity repository | Faible; test de transmission de l'identité de session |
| 9 | `app/api/coach/default-assignment/route.ts` | Admin, affectation serveur après authentification | `createClient` service-role local | `createSupabaseAdminClient` | Élevé mais caractérisé; tests route/RLS et E2E default coach |
| 10 | `app/api/coach/disconnect/route.ts` | Admin, suppression des relations du client authentifié | `createClient` service-role local | admin factory | Élevé mais borné; tests route et matrice RLS |

La sélection couvre quatre sites browser, quatre sites server et deux sites admin. Les routes `sync-locale` et `locale` démontrent des lectures métier par repository; `locale` démontre l'écriture sûre. Les frontières admin restent créées uniquement après `auth.getUser()` et utilisent toujours l'identifiant de la session.

## Compteurs mesurés

L'inventaire automatisé parcourt `app/` et `lib/`, exclut uniquement les trois factories canoniques et compte les appels réels à `createBrowserClient`, `createServerClient` et `createClient`.

| Mesure | Avant | Après |
|---|---:|---:|
| Constructeurs legacy directs | 65 | 55 |
| Fichiers contenant ces constructeurs | 58 | 48 |
| Accès directs `.from('profiles')` | 89 | 87 |
| Occurrences de champs abonnement | 170 | 170 |

Le test `supabase-access-migration.test.ts` porte la liste fermée des dix fichiers, vérifie leur nouvelle frontière et bloque tout retour d'un constructeur legacy. Tests et documentation ne sont jamais comptés comme sites applicatifs.

## Contrats préservés

- Le singleton browser conserve la même session Auth et reste exempt de service-role ou d'import `server-only`.
- Chaque route server reçoit une nouvelle instance liée aux cookies de sa requête.
- Identité et e-mail proviennent de `auth.getUser()` via le repository identité, jamais du corps ou d'un identifiant navigateur.
- `not_found` et `failure` restent distincts; les réponses locale neutralisent les deux sans exposer de message Supabase.
- L'écriture de locale accepte seulement `preferred_locale` via `SafeProfileUpdate` et conserve les statuts HTTP historiques.
- Les deux routes admin vérifient d'abord la session et leur configuration, puis créent une factory sans cookies. La service-role ne traverse jamais un module client.

## Accès restant à migrer

Il reste 55 constructions legacy dans 48 fichiers, 87 accès directs à `profiles` et 170 occurrences de champs d'abonnement. Les exports de compatibilité restent nécessaires. Les divergences `payments`, Stripe Connect, `coach_bio`, `cgu_accepted_at` et `subscription_price` ne sont ni corrigées ni ajoutées aux types dans cette tranche.
