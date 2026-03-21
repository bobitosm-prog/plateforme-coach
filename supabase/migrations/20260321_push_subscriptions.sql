create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  subscription jsonb not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "users manage own subscriptions"
on push_subscriptions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
