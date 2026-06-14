# Pending Admin Features

## Lifetime Grant via Admin UI

### Context
bobitosm@gmail.com is the admin email. The product needs a UI for
the admin to grant lifetime access to specific clients (free
accounts for family, friends, beta testers, etc.).

### Current state (after lifetime bypass fix, 2026-04-25)
Setting profiles.subscription_type = 'lifetime' on a user grants
them full access automatically (paywall bypassed by hasPaidSub in
useClientDashboard.ts). This works at the DB level but there is no
UI to do it - admin must use Supabase SQL Editor manually.

Examples of users currently granted lifetime via direct SQL:
- mia.nunes@bluewin.ch (fixed 2026-04-25)
- f.marco@me.com (since onboarding)
- marco.ferreira@bluemail.ch (invited type, similar bypass)

### Required feature

Frontend
- Admin-only route /admin/users (or section in existing admin space)
- Search/list of users by email or name
- Per-user actions:
  * Toggle "Lifetime access" (sets subscription_type='lifetime',
    end_date=null, price=null, customer_id=null)
  * Toggle "Invited" (similar pattern, used for coach-invited)
  * Reset to 'active' (regular paid)
- Optional: audit log column showing who granted access and when

Backend
- Server action or API route protected by isAdmin check
- isAdmin is currently determined by profile.email matching a
  hardcoded list ['bobitosm@gmail.com']. Better long-term: add
  is_admin BOOLEAN column on profiles, set TRUE for admin users.
- The action runs UPDATE profiles SET subscription_type = X
  WHERE id = Y

### Implementation notes
- Reuse existing admin patterns if any (check coach role detection)
- RLS: ensure only admins can UPDATE these columns on other users
- Add audit log table or columns: granted_by_id, granted_at, action
- Consider exporting a CSV of lifetime accounts for tracking

### Estimated effort
1.5-2h focused session.

### Priority
Medium. Current SQL workflow is manageable for a small user base.
Will become urgent when admin needs to grant access frequently or
when delegating admin actions to multiple people.
