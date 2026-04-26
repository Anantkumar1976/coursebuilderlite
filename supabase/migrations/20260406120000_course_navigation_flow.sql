-- How learners move through pages in the course player.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS navigation_flow text NOT NULL DEFAULT 'open'
  CHECK (navigation_flow IN ('linear', 'open', 'website'));

COMMENT ON COLUMN public.courses.navigation_flow IS
  'linear: unlock pages in order; open: jump anywhere; website: single scrolling page of sections.';
