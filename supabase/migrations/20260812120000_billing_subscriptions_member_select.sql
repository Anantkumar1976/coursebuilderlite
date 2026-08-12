-- Let team members read the shared subscription row (status, workspace name).
-- Previously only the billed owner (user_id) could SELECT, which broke invitee login.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_subscriptions'
      and policyname = 'billing_subscriptions_select_members'
  ) then
    create policy billing_subscriptions_select_members
      on public.billing_subscriptions
      for select
      using (
        exists (
          select 1
          from public.billing_subscription_memberships m
          where m.subscription_id = billing_subscriptions.subscription_id
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;
