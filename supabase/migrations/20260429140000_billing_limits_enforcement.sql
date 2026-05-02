create table if not exists public.billing_subscription_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id text not null,
  plan_key text not null,
  authors_limit integer not null check (authors_limit > 0),
  monthly_exports_limit integer not null check (monthly_exports_limit >= 0),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists billing_subscription_memberships_subscription_id_idx
  on public.billing_subscription_memberships (subscription_id);

create table if not exists public.billing_export_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id text not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  export_format text not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_export_events_user_created_at_idx
  on public.billing_export_events (user_id, created_at);

create index if not exists billing_export_events_subscription_created_at_idx
  on public.billing_export_events (subscription_id, created_at);

alter table public.billing_subscription_memberships enable row level security;
alter table public.billing_export_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_subscription_memberships'
      and policyname = 'billing_subscription_memberships_select_own'
  ) then
    create policy billing_subscription_memberships_select_own
      on public.billing_subscription_memberships
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_subscription_memberships'
      and policyname = 'billing_subscription_memberships_insert_own'
  ) then
    create policy billing_subscription_memberships_insert_own
      on public.billing_subscription_memberships
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_export_events'
      and policyname = 'billing_export_events_select_own'
  ) then
    create policy billing_export_events_select_own
      on public.billing_export_events
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_export_events'
      and policyname = 'billing_export_events_insert_own'
  ) then
    create policy billing_export_events_insert_own
      on public.billing_export_events
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;
