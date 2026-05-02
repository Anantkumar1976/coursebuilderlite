create table if not exists public.billing_team_invites (
  id uuid primary key default gen_random_uuid(),
  subscription_id text not null,
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  email_normalized text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  plan_key text not null,
  authors_limit integer not null check (authors_limit > 0),
  monthly_exports_limit integer not null check (monthly_exports_limit >= 0),
  expires_at timestamptz not null,
  accepted_user_id uuid null references auth.users (id) on delete set null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index if not exists billing_team_invites_one_pending_per_email
  on public.billing_team_invites (subscription_id, email_normalized)
  where status = 'pending';

create index if not exists billing_team_invites_subscription_id_idx
  on public.billing_team_invites (subscription_id);

create index if not exists billing_team_invites_token_idx
  on public.billing_team_invites (token);

alter table public.billing_team_invites enable row level security;

create policy billing_team_invites_select_subscription
  on public.billing_team_invites
  for select
  to authenticated
  using (
    subscription_id = (auth.jwt()->'user_metadata'->>'paypal_subscription_id')
    or subscription_id in (
      select subscription_id
      from public.billing_subscription_memberships
      where user_id = auth.uid()
    )
    or invited_by_user_id = auth.uid()
  );

create policy billing_team_invites_insert_subscription
  on public.billing_team_invites
  for insert
  to authenticated
  with check (
    subscription_id = (auth.jwt()->'user_metadata'->>'paypal_subscription_id')
    or subscription_id in (
      select subscription_id
      from public.billing_subscription_memberships
      where user_id = auth.uid()
    )
  );

create policy billing_team_invites_update_subscription
  on public.billing_team_invites
  for update
  to authenticated
  using (
    subscription_id = (auth.jwt()->'user_metadata'->>'paypal_subscription_id')
    or subscription_id in (
      select subscription_id
      from public.billing_subscription_memberships
      where user_id = auth.uid()
    )
    or invited_by_user_id = auth.uid()
  )
  with check (
    subscription_id = (auth.jwt()->'user_metadata'->>'paypal_subscription_id')
    or subscription_id in (
      select subscription_id
      from public.billing_subscription_memberships
      where user_id = auth.uid()
    )
    or invited_by_user_id = auth.uid()
  );
