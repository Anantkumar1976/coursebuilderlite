-- Course "featured" flag + public (anon) read access for featured demo content.
--
-- Featured courses power the "See it in action" section on the marketing site
-- and the public /demo/[courseId] share link. RLS additions here are ADDITIVE
-- (RLS policies OR together) so existing workspace policies remain unchanged.
--
-- Only the master admin can toggle is_featured (enforced in the server action);
-- however this migration itself does not gate mutations, since the master admin
-- writes through the service-role client which bypasses RLS anyway.

-- ---------------------------------------------------------------------------
-- 1) Column + index
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.courses.is_featured IS
  'When true, the course is publicly readable via /demo/<id> and appears as a demo on the marketing site.';

CREATE INDEX IF NOT EXISTS idx_courses_is_featured
  ON public.courses (is_featured)
  WHERE is_featured = true;

-- ---------------------------------------------------------------------------
-- 2) Anon + authenticated read of featured courses (additive)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_select_featured_public" ON public.courses;
CREATE POLICY "courses_select_featured_public"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (is_featured = true);

-- ---------------------------------------------------------------------------
-- 3) Anon + authenticated read of lessons for featured courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lessons_select_featured_public" ON public.lessons;
CREATE POLICY "lessons_select_featured_public"
  ON public.lessons FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.is_featured = true
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Anon + authenticated read of pages for featured courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "pages_select_featured_public" ON public.pages;
CREATE POLICY "pages_select_featured_public"
  ON public.pages FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = pages.course_id
        AND c.is_featured = true
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Anon + authenticated read of reference materials for featured courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "crm_select_featured_public" ON public.course_reference_materials;
CREATE POLICY "crm_select_featured_public"
  ON public.course_reference_materials FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_reference_materials.course_id
        AND c.is_featured = true
    )
  );

-- ---------------------------------------------------------------------------
-- 6) Anon + authenticated read of asset metadata belonging to featured courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "assets_select_featured_public" ON public.assets;
CREATE POLICY "assets_select_featured_public"
  ON public.assets FOR SELECT
  TO anon, authenticated
  USING (
    course_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = assets.course_id
        AND c.is_featured = true
    )
  );
