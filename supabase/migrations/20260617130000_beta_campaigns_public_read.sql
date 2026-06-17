create policy "beta_campaigns_public_read"
  on public.beta_campaigns
  for select
  to public
  using (true);
