-- Player theme, banner, and downloadable reference materials

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS banner_asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS theme_fonts jsonb NOT NULL DEFAULT '{"courseTitle":"system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif","pageTitle":"system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif","pageContent":"system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_colors jsonb NOT NULL DEFAULT '{"button":"#18181b","highlight":"#27272a"}'::jsonb;

COMMENT ON COLUMN public.courses.banner_asset_id IS 'Hero image for course launch screen (must be an image asset for this course).';
COMMENT ON COLUMN public.courses.theme_fonts IS 'CSS font-family stacks: courseTitle, pageTitle, pageContent.';
COMMENT ON COLUMN public.courses.theme_colors IS 'Hex colors: button (primary), highlight (accents).';

CREATE TABLE public.course_reference_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_reference_materials_course_asset_unique UNIQUE (course_id, asset_id)
);

CREATE INDEX idx_course_reference_materials_course_id
  ON public.course_reference_materials (course_id, sort_order);

COMMENT ON TABLE public.course_reference_materials IS 'Supplementary files (PDFs, etc.) linked to a course for learners.';

ALTER TABLE public.course_reference_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_select_via_course"
  ON public.course_reference_materials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "crm_insert_via_course"
  ON public.course_reference_materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_id AND a.user_id = (SELECT auth.uid())
        AND (a.course_id IS NULL OR a.course_id = course_id)
    )
  );

CREATE POLICY "crm_update_via_course"
  ON public.course_reference_materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "crm_delete_via_course"
  ON public.course_reference_materials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );
