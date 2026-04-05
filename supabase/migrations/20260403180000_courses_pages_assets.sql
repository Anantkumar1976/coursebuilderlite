-- CourseBuilder Lite: core content tables (JSON page content, file metadata for Storage)
--
-- Apply: Supabase Dashboard → SQL → New query → paste → Run, or `supabase db push` with CLI linked to this project.
-- Storage: create a private bucket named `assets` (Dashboard → Storage) before uploading files referenced by public.assets.

-- Course lifecycle
CREATE TYPE public.course_status AS ENUM ('draft', 'published');

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.course_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_user_id ON public.courses (user_id);
CREATE INDEX idx_courses_user_updated ON public.courses (user_id, updated_at DESC);

COMMENT ON TABLE public.courses IS 'A course owned by a user; pages and export are scoped to this row.';

-- ---------------------------------------------------------------------------
-- pages (template-driven JSON content)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pages_course_id ON public.pages (course_id);
CREATE INDEX idx_pages_course_sort ON public.pages (course_id, sort_order);

COMMENT ON TABLE public.pages IS 'One page per course; content is JSON describing template blocks.';
COMMENT ON COLUMN public.pages.content IS 'Structured page payload (templates, blocks, assessment refs).';

-- ---------------------------------------------------------------------------
-- assets (metadata for Supabase Storage objects)
-- ---------------------------------------------------------------------------
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses (id) ON DELETE SET NULL,
  bucket text NOT NULL DEFAULT 'assets',
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_bucket_path_unique UNIQUE (bucket, storage_path)
);

CREATE INDEX idx_assets_user_id ON public.assets (user_id);
CREATE INDEX idx_assets_course_id ON public.assets (course_id);

COMMENT ON TABLE public.assets IS 'Points to an object in Supabase Storage; bucket + storage_path must match the uploaded file.';
COMMENT ON COLUMN public.assets.course_id IS 'Optional; set when the file is scoped to a specific course.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- courses: owner only
CREATE POLICY "courses_select_own"
  ON public.courses FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "courses_insert_own"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "courses_update_own"
  ON public.courses FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "courses_delete_own"
  ON public.courses FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- pages: via owning the parent course
CREATE POLICY "pages_select_via_course"
  ON public.pages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = pages.course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "pages_insert_via_course"
  ON public.pages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "pages_update_via_course"
  ON public.pages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = pages.course_id AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "pages_delete_via_course"
  ON public.pages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = pages.course_id AND c.user_id = (SELECT auth.uid())
    )
  );

-- assets: owner; optional course must also be owned
CREATE POLICY "assets_select_own"
  ON public.assets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "assets_insert_own"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      course_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "assets_update_own"
  ON public.assets FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      course_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "assets_delete_own"
  ON public.assets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
