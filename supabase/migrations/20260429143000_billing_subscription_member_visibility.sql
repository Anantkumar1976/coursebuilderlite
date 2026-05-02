create or replace function public.current_user_subscription_ids()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(subscription_id), '{}'::text[])
  from public.billing_subscription_memberships
  where user_id = auth.uid();
$$;

revoke all on function public.current_user_subscription_ids() from public;
grant execute on function public.current_user_subscription_ids() to authenticated;

drop policy if exists billing_subscription_memberships_select_own
  on public.billing_subscription_memberships;

create policy billing_subscription_memberships_select_subscription_members
  on public.billing_subscription_memberships
  for select
  using (
    auth.uid() = user_id
    or subscription_id = any(public.current_user_subscription_ids())
  );
