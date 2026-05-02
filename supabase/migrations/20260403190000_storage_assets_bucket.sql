-- Private bucket for course media; paths: {user_id}/{course_id}/{object_name}
-- Object name should include a unique id (see app upload) to avoid collisions.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('assets', 'assets', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

-- storage.objects policies: users read/write only under their user_id prefix;
-- uploads must target a course they own (second path segment = course id).

DROP POLICY IF EXISTS "assets_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_insert_course" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "assets_storage_delete_own" ON storage.objects;

CREATE POLICY "assets_storage_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "assets_storage_insert_course"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = split_part(name, '/', 2)::uuid
        AND c.user_id = (SELECT auth.uid())
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
