-- Exécuté manuellement en prod le 17/06. Faille RLS P0 : policies UPDATE
-- sur profiles avaient with_check=null → un user pouvait se poser
-- subscription_type='lifetime' ou role='super_admin'. Fix = trigger
-- BEFORE UPDATE (RLS ne peut pas comparer OLD/NEW). security invoker =
-- seuls authenticated/anon sont bloqués, service_role/postgres/SECURITY
-- DEFINER passent (RPC claim_beta_slot, webhooks Stripe, etc.).

create or replace function public.guard_profile_sensitive_columns()
returns trigger
language plpgsql
security invoker
as $func$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.role                  is distinct from old.role then
    raise exception 'Colonne protégée non modifiable: role' using errcode = '42501';
  end if;
  if new.status                is distinct from old.status then
    raise exception 'Colonne protégée non modifiable: status' using errcode = '42501';
  end if;
  if new.subscription_type     is distinct from old.subscription_type then
    raise exception 'Colonne protégée non modifiable: subscription_type' using errcode = '42501';
  end if;
  if new.subscription_status   is distinct from old.subscription_status then
    raise exception 'Colonne protégée non modifiable: subscription_status' using errcode = '42501';
  end if;
  if new.subscription_end_date is distinct from old.subscription_end_date then
    raise exception 'Colonne protégée non modifiable: subscription_end_date' using errcode = '42501';
  end if;
  if new.subscription_price    is distinct from old.subscription_price then
    raise exception 'Colonne protégée non modifiable: subscription_price' using errcode = '42501';
  end if;
  if new.trial_ends_at         is distinct from old.trial_ends_at then
    raise exception 'Colonne protégée non modifiable: trial_ends_at' using errcode = '42501';
  end if;
  return new;
end;
$func$;

drop trigger if exists guard_profile_sensitive_columns on public.profiles;

create trigger guard_profile_sensitive_columns
  before update on public.profiles
  for each row
  execute function public.guard_profile_sensitive_columns();
