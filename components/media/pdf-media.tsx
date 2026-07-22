"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import { createClient } from "@/lib/supabase/client";

import type { CourseAssetLite, AssetsUpdatedHandler } from "./text-image-media";

export type PdfMediaValue = {
  pdfAssetId?: string | null;
  pdfUrl: string;
};

type Props = {
  courseId: string;
  value: PdfMediaValue;
  onChange: (next: PdfMediaValue) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: AssetsUpdatedHandler;
  idPrefix?: string;
};

export function PdfMediaPanel({
  courseId,
  value,
  onChange,
  courseAssets,
  onAssetsUpdated,
  idPrefix = "pdf",
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pdfAssets = useMemo(
    () =>
      courseAssets.filter(
        (a) =>
          a.mime_type?.toLowerCase() === "application/pdf" ||
          a.filename.toLowerCase().endsWith(".pdf"),
      ),
    [courseAssets],
  );

  useEffect(() => {
    const assetId = value.pdfAssetId;
    if (!assetId) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("assets")
        .select("bucket, storage_path")
        .eq("id", assetId)
        .maybeSingle();
      if (!row || cancelled) return;
      const { data: signed } = await supabase.storage
        .from(row.bucket)
        .createSignedUrl(row.storage_path, 3600);
      if (!cancelled) setPreviewUrl(signed?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.pdfAssetId]);

  const embedSrc =
    value.pdfAssetId && previewUrl ? previewUrl : value.pdfUrl.trim() || null;

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const lowerName = file.name.toLowerCase();
      const isPdf =
        file.type.toLowerCase() === "application/pdf" || lowerName.endsWith(".pdf");
      if (!isPdf) {
        setUploadError("Please choose a PDF file.");
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUploadError("You must be signed in to upload.");
          return;
        }
        const assetId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `pdf-${Date.now()}`;
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
            contentType: file.type || "application/pdf",
          });
        if (upErr) {
          setUploadError(upErr.message);
          return;
        }
        const { error: insErr } = await supabase.from("assets").insert({
          id: assetId,
          user_id: user.id,
          course_id: courseId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || "application/pdf",
          bytes: file.size,
        });
        if (insErr) {
          await supabase.storage.from("assets").remove([storagePath]);
          setUploadError(insErr.message);
          return;
        }
        onChange({ pdfAssetId: assetId, pdfUrl: "" });
        onAssetsUpdated({
          id: assetId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || "application/pdf",
          bytes: file.size,
        });
      } finally {
        setUploading(false);
      }
    },
    [courseId, onAssetsUpdated, onChange],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Author note: Embedded PDFs must be publicly accessible or reachable from
        your corporate network so learners can open them.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading..." : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
        </label>
        {value.pdfAssetId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => onChange({ ...value, pdfAssetId: null })}
          >
            Clear uploaded PDF
          </button>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}

      {pdfAssets.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Or pick a PDF from this course
          </p>
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
            {pdfAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`rounded-md px-2 py-1.5 text-left text-sm ${
                  value.pdfAssetId === a.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() => onChange({ pdfAssetId: a.id, pdfUrl: "" })}
              >
                {a.filename}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          htmlFor={`${idPrefix}-url`}
        >
          PDF URL (optional)
        </label>
        <input
          id={`${idPrefix}-url`}
          type="url"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          value={value.pdfUrl}
          onChange={(e) =>
            onChange({
              pdfUrl: e.target.value,
              pdfAssetId: e.target.value.trim() ? null : value.pdfAssetId,
            })
          }
          placeholder="https://example.com/doc.pdf"
        />
      </div>

      {embedSrc ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <iframe
            src={embedSrc}
            className="h-64 w-full"
            title="PDF preview"
            loading="lazy"
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No PDF selected yet.</p>
      )}
    </div>
  );
}

