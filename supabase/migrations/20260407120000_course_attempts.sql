-- Course attempts limit (NULL = unlimited, positive int = max attempts)

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS attempts_limit integer NULL
  CHECK (attempts_limit IS NULL OR attempts_limit > 0);

COMMENT ON COLUMN public.courses.attempts_limit IS
  'Maximum course attempts a learner may take. NULL means unlimited; otherwise the course locks after the count is exhausted.';
