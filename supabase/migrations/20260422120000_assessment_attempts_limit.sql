-- Per-course cap on how many times the final assessment can be submitted (preview + SCORM).
-- NULL = unlimited (default).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS assessment_attempts_limit integer NULL
    CHECK (assessment_attempts_limit IS NULL OR assessment_attempts_limit > 0);

COMMENT ON COLUMN public.courses.assessment_attempts_limit IS
  'Max submitted final-assessment scores per enrollment; NULL = unlimited.';
