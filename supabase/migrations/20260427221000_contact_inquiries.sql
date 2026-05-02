create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text,
  inquiry_type text not null check (
    inquiry_type in ('sales', 'licensing', 'feature_request', 'bug_report', 'other')
  ),
  message text not null
);

alter table public.contact_inquiries enable row level security;

drop policy if exists "insert_contact_inquiries_anon" on public.contact_inquiries;
create policy "insert_contact_inquiries_anon"
on public.contact_inquiries
for insert
to anon, authenticated
with check (true);
