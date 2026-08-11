-- Company / workgroup name for each subscription workspace.

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS workspace_name text;

COMMENT ON COLUMN public.billing_subscriptions.workspace_name IS
  'Display name for the company or workgroup that owns this subscription.';

ALTER TABLE public.billing_team_invites
  ADD COLUMN IF NOT EXISTS workspace_name text;

COMMENT ON COLUMN public.billing_team_invites.workspace_name IS
  'Snapshot of the company/workgroup name at invite time (for signup UX).';
