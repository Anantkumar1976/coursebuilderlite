-- Course-level delivery / SCORM metadata (used by export and future settings UI).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS scorm_passing_score_percent smallint NOT NULL DEFAULT 70
    CHECK (scorm_passing_score_percent >= 0 AND scorm_passing_score_percent <= 100),
  ADD COLUMN IF NOT EXISTS manifest_description text,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer
    CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0);

COMMENT ON COLUMN public.courses.locale IS 'BCP 47 language tag (e.g. en, en-US) for packaged content and manifest.';
COMMENT ON COLUMN public.courses.scorm_passing_score_percent IS 'Mastery threshold 0–100 for SCORM lesson_status passed vs failed.';
COMMENT ON COLUMN public.courses.manifest_description IS 'Optional summary for imsmanifest / LMS; falls back to description when null.';
COMMENT ON COLUMN public.courses.estimated_duration_minutes IS 'Optional typical time to complete; used in manifest metadata when set.';
