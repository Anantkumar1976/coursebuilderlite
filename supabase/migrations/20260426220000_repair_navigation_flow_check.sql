-- Some databases may have an older CHECK on navigation_flow that does not allow
-- 'website'. Drop matching constraints and enforce the full set of values.

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_navigation_flow_check;

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'courses'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%navigation_flow%'
  LOOP
    EXECUTE format('ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_navigation_flow_check
  CHECK (navigation_flow IN ('linear', 'open', 'website'));
