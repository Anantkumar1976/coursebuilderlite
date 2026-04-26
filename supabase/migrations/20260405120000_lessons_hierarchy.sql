-- Course > Lesson > Page hierarchy

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_course_id ON public.lessons (course_id);
CREATE INDEX idx_lessons_course_sort ON public.lessons (course_id, sort_order);

COMMENT ON TABLE public.lessons IS 'Lesson container within a course; pages belong to a lesson.';

ALTER TABLE public.pages
  ADD COLUMN lesson_id uuid REFERENCES public.lessons (id) ON DELETE CASCADE;

-- One backfill lesson per course that already has pages
INSERT INTO public.lessons (course_id, title, sort_order)
SELECT c.id, 'Lesson 1', 0
FROM public.courses c
WHERE EXISTS (SELECT 1 FROM public.pages p WHERE p.course_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.course_id = c.id);

UPDATE public.pages p
SET lesson_id = l.id
FROM public.lessons l
WHERE l.course_id = p.course_id
  AND p.lesson_id IS NULL;

-- Safety: any remaining pages without a lesson
INSERT INTO public.lessons (course_id, title, sort_order)
SELECT c.id, 'Lesson 1', 0
FROM public.courses c
WHERE EXISTS (SELECT 1 FROM public.pages p WHERE p.course_id = c.id AND p.lesson_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.lessons l2 WHERE l2.course_id = c.id);

UPDATE public.pages p
SET lesson_id = l.id
FROM public.lessons l
WHERE l.course_id = p.course_id
  AND p.lesson_id IS NULL;

ALTER TABLE public.pages ALTER COLUMN lesson_id SET NOT NULL;

CREATE INDEX idx_pages_lesson_id ON public.pages (lesson_id);
CREATE INDEX idx_pages_lesson_sort ON public.pages (lesson_id, sort_order);

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_select_via_course"
  ON public.lessons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lessons_insert_via_course"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lessons_update_via_course"
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lessons_delete_via_course"
  ON public.lessons FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.user_id = (SELECT auth.uid())
    )
  );
