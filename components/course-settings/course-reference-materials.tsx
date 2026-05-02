"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  addCourseReferenceMaterial,
  deleteCourseReferenceMaterialAction,
} from "@/lib/actions/course-appearance";
import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import { createClient } from "@/lib/supabase/client";

export type ReferenceRow = {
  id: string;
  label: string;
  asset_id: string;
};

type Props = {
  courseId: string;
  materials: ReferenceRow[];
};

export function CourseReferenceMaterialsEditor({
  courseId,
  materials,
}: Props) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Sign in.");
          return;
        }

        const assetId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `r-${Date.now()}`;
        const storagePath = buildAssetStoragePath(
          user.id,
          courseId,
          assetId,
          file.name,
        );

        const { error: upErr } = await supabase.storage
          .from("assets")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });
        if (upErr) {
          setError(upErr.message);
          return;
        }

        const { error: insErr } = await supabase.from("assets").insert({
          id: assetId,
          user_id: user.id,
          course_id: courseId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || null,
          bytes: file.size,
        });

        if (insErr) {
          await supabase.storage.from("assets").remove([storagePath]);
          setError(insErr.message);
          return;
        }

        const res = await addCourseReferenceMaterial(
          courseId,
          assetId,
          label.trim() || file.name,
        );
        if (res && "error" in res) {
          setError("Could not add reference.");
          return;
        }
        setLabel("");
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [courseId, label, router],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Reference materials
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          PDFs, documents, or other files learners can download from the launch
          screen.
        </p>
      </div>
      <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="ref-label"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Label (optional)
          </label>
          <input
            id="ref-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Employee handbook"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading…" : "Add file"}
          <input
            type="file"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
        </label>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {materials.length > 0 ? (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                {m.label}
              </span>
              <form action={deleteCourseReferenceMaterialAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="materialId" value={m.id} />
                <button
                  type="submit"
                  className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No reference files yet.</p>
      )}
    </div>
  );
}
