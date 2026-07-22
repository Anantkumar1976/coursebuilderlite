-- Team workspace: courses belong to a subscription (shared library), not a single author.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS subscription_id text;

CREATE INDEX IF NOT EXISTS idx_courses_subscription_id
  ON public.courses (subscription_id);

CREATE INDEX IF NOT EXISTS idx_courses_subscription_updated
  ON public.courses (subscription_id, updated_at DESC);

COMMENT ON COLUMN public.courses.subscription_id IS
  'PayPal subscription / team workspace. All members on this subscription can access the course.';
COMMENT ON COLUMN public.courses.user_id IS
  'Author who originally created the course (audit). Access is via subscription_id.';

-- Backfill from membership rows, then auth metadata for stragglers.
UPDATE public.courses c
SET subscription_id = m.subscription_id
FROM public.billing_subscription_memberships m
WHERE m.user_id = c.user_id
  AND c.subscription_id IS NULL;

UPDATE public.courses c
SET subscription_id = u.raw_user_meta_data->>'paypal_subscription_id'
FROM auth.users u
WHERE u.id = c.user_id
  AND c.subscription_id IS NULL
  AND u.raw_user_meta_data->>'paypal_subscription_id' IS NOT NULL
  AND length(trim(u.raw_user_meta_data->>'paypal_subscription_id')) > 0;

CREATE OR REPLACE FUNCTION public.user_has_subscription_access(target_subscription_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_subscription_id IS NOT NULL
    AND length(trim(target_subscription_id)) > 0
    AND (
      target_subscription_id = (auth.jwt()->'user_metadata'->>'paypal_subscription_id')
      OR EXISTS (
        SELECT 1
        FROM public.billing_subscription_memberships m
        WHERE m.user_id = auth.uid()
          AND m.subscription_id = target_subscription_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_course(target_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = target_course_id
      AND (
        (
          c.subscription_id IS NOT NULL
          AND public.user_has_subscription_access(c.subscription_id)
        )
        OR (
          c.subscription_id IS NULL
          AND c.user_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_select_own" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_own" ON public.courses;
DROP POLICY IF EXISTS "courses_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_delete_own" ON public.courses;

CREATE POLICY "courses_select_workspace"
  ON public.courses FOR SELECT TO authenticated
  USING (
    (
      subscription_id IS NOT NULL
      AND public.user_has_subscription_access(subscription_id)
    )
    OR (
      subscription_id IS NULL
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "courses_insert_workspace"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND subscription_id IS NOT NULL
    AND public.user_has_subscription_access(subscription_id)
  );

CREATE POLICY "courses_update_workspace"
  ON public.courses FOR UPDATE TO authenticated
  USING (
    (
      subscription_id IS NOT NULL
      AND public.user_has_subscription_access(subscription_id)
    )
    OR (
      subscription_id IS NULL
      AND user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      subscription_id IS NOT NULL
      AND public.user_has_subscription_access(subscription_id)
    )
    OR (
      subscription_id IS NULL
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "courses_delete_workspace"
  ON public.courses FOR DELETE TO authenticated
  USING (
    (
      subscription_id IS NOT NULL
      AND public.user_has_subscription_access(subscription_id)
    )
    OR (
      subscription_id IS NULL
      AND user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "pages_select_via_course" ON public.pages;
DROP POLICY IF EXISTS "pages_insert_via_course" ON public.pages;
DROP POLICY IF EXISTS "pages_update_via_course" ON public.pages;
DROP POLICY IF EXISTS "pages_delete_via_course" ON public.pages;

CREATE POLICY "pages_select_workspace"
  ON public.pages FOR SELECT TO authenticated
  USING (public.user_can_access_course(course_id));

CREATE POLICY "pages_insert_workspace"
  ON public.pages FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_course(course_id));

CREATE POLICY "pages_update_workspace"
  ON public.pages FOR UPDATE TO authenticated
  USING (public.user_can_access_course(course_id))
  WITH CHECK (public.user_can_access_course(course_id));

CREATE POLICY "pages_delete_workspace"
  ON public.pages FOR DELETE TO authenticated
  USING (public.user_can_access_course(course_id));

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lessons_select_via_course" ON public.lessons;
DROP POLICY IF EXISTS "lessons_insert_via_course" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update_via_course" ON public.lessons;
DROP POLICY IF EXISTS "lessons_delete_via_course" ON public.lessons;

CREATE POLICY "lessons_select_workspace"
  ON public.lessons FOR SELECT TO authenticated
  USING (public.user_can_access_course(course_id));

CREATE POLICY "lessons_insert_workspace"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_course(course_id));

CREATE POLICY "lessons_update_workspace"
  ON public.lessons FOR UPDATE TO authenticated
  USING (public.user_can_access_course(course_id))
  WITH CHECK (public.user_can_access_course(course_id));

CREATE POLICY "lessons_delete_workspace"
  ON public.lessons FOR DELETE TO authenticated
  USING (public.user_can_access_course(course_id));

-- ---------------------------------------------------------------------------
-- assets (metadata)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "assets_select_own" ON public.assets;
DROP POLICY IF EXISTS "assets_insert_own" ON public.assets;
DROP POLICY IF EXISTS "assets_update_own" ON public.assets;
DROP POLICY IF EXISTS "assets_delete_own" ON public.assets;

CREATE POLICY "assets_select_workspace"
  ON public.assets FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      course_id IS NOT NULL
      AND public.user_can_access_course(course_id)
    )
  );

CREATE POLICY "assets_insert_workspace"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      course_id IS NULL
      OR public.user_can_access_course(course_id)
    )
  );

CREATE POLICY "assets_update_workspace"
  ON public.assets FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      course_id IS NOT NULL
      AND public.user_can_access_course(course_id)
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      course_id IS NULL
      OR public.user_can_access_course(course_id)
    )
  );

CREATE POLICY "assets_delete_workspace"
  ON public.assets FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      course_id IS NOT NULL
      AND public.user_can_access_course(course_id)
    )
  );

-- ---------------------------------------------------------------------------
-- course_reference_materials
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "crm_select_via_course" ON public.course_reference_materials;
DROP POLICY IF EXISTS "crm_insert_via_course" ON public.course_reference_materials;
DROP POLICY IF EXISTS "crm_update_via_course" ON public.course_reference_materials;
DROP POLICY IF EXISTS "crm_delete_via_course" ON public.course_reference_materials;

CREATE POLICY "crm_select_workspace"
  ON public.course_reference_materials FOR SELECT TO authenticated
  USING (public.user_can_access_course(course_id));

CREATE POLICY "crm_insert_workspace"
  ON public.course_reference_materials FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_course(course_id)
    AND EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_id
        AND (a.course_id IS NULL OR a.course_id = course_id)
    )
  );

CREATE POLICY "crm_update_workspace"
  ON public.course_reference_materials FOR UPDATE TO authenticated
  USING (public.user_can_access_course(course_id))
  WITH CHECK (public.user_can_access_course(course_id));

CREATE POLICY "crm_delete_workspace"
  ON public.course_reference_materials FOR DELETE TO authenticated
  USING (public.user_can_access_course(course_id));

-- ---------------------------------------------------------------------------
-- storage.objects (team can read media uploaded by other authors on shared courses)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "assets_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_insert_course" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_delete_own" ON storage.objects;

CREATE POLICY "assets_storage_select_workspace"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets'
    AND (
      split_part(name, '/', 1) = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = split_part(name, '/', 2)::uuid
          AND public.user_has_subscription_access(c.subscription_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = split_part(name, '/', 2)::uuid
          AND c.subscription_id IS NULL
          AND c.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "assets_storage_insert_workspace"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND (
      EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = split_part(name, '/', 2)::uuid
          AND public.user_has_subscription_access(c.subscription_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = split_part(name, '/', 2)::uuid
          AND c.subscription_id IS NULL
          AND c.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "assets_storage_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "assets_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );
