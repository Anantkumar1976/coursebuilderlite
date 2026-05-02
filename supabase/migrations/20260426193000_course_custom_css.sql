ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS custom_css text NULL;

COMMENT ON COLUMN public.courses.custom_css IS
  'Optional author-provided CSS applied to player and SCORM output.';

