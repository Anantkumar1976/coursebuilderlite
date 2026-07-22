"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import type { PageContentV1 } from "@/lib/page-builder";
import { createClient } from "@/lib/supabase/client";

export type CourseAssetLite = {
  id: string;
  filename: string;
  mime_type: string | null;
  bytes: number | null;
  bucket: string;
  storage_path: string;
};

export type AssetsUpdatedHandler = (added?: CourseAssetLite) => void;

export function isCourseImageAsset(a: CourseAssetLite): boolean {
  const mime = a.mime_type?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(a.filename);
}

export type TextImageImageValue = {
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
};

type TextImage = Extract<PageContentV1, { template: "text_image" }>;

type Props = {
  courseId: string;
  content: TextImage;
  onChange: (next: TextImage) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: AssetsUpdatedHandler;
};

/** Image upload / URL / alt — used for Text + Image template and per block in multi-block layouts. */
export function TextImageImagePanel({
  courseId,
  value,
  onChange,
  courseAssets,
  onAssetsUpdated,
  idPrefix = "ti",
}: {
  courseId: string;
  value: TextImageImageValue;
  onChange: (next: TextImageImageValue) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: AssetsUpdatedHandler;
  /** Unique prefix for form ids when multiple panels on the page. */
  idPrefix?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  /** Instant preview while a file is uploading (revoked after server preview loads). */
  const [uploadObjectUrl, setUploadObjectUrl] = useState<string | null>(null);
  const uploadObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const assetId = value.imageAssetId;
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
      if (!cancelled && signed?.signedUrl) setPreviewUrl(signed.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.imageAssetId]);

  useEffect(() => {
    if (!uploadObjectUrl) return;
    if (value.imageAssetId && previewUrl) {
      URL.revokeObjectURL(uploadObjectUrl);
      uploadObjectUrlRef.current = null;
      setUploadObjectUrl(null);
    }
  }, [value.imageAssetId, previewUrl, uploadObjectUrl]);

  useEffect(() => {
    if (value.imageAssetId) return;
    if (uploadObjectUrlRef.current) {
      URL.revokeObjectURL(uploadObjectUrlRef.current);
      uploadObjectUrlRef.current = null;
    }
    setUploadObjectUrl(null);
  }, [value.imageAssetId]);

  const displaySrc =
    uploadObjectUrl ||
    (value.imageAssetId && previewUrl
      ? previewUrl
      : value.imageUrl.trim() || null);

  const imageLibraryAssets = useMemo(
    () => courseAssets.filter(isCourseImageAsset),
    [courseAssets],
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setUploadError("Please choose an image file.");
        return;
      }
      setUploadError(null);
      if (uploadObjectUrlRef.current) {
        URL.revokeObjectURL(uploadObjectUrlRef.current);
        uploadObjectUrlRef.current = null;
      }
      const localUrl = URL.createObjectURL(file);
      uploadObjectUrlRef.current = localUrl;
      setUploadObjectUrl(localUrl);
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUploadError("You must be signed in to upload.");
          if (uploadObjectUrlRef.current) {
            URL.revokeObjectURL(uploadObjectUrlRef.current);
            uploadObjectUrlRef.current = null;
          }
          setUploadObjectUrl(null);
          return;
        }

        const assetId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `a-${Date.now()}`;

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
            contentType: file.type || undefined,
          });
        if (upErr) {
          setUploadError(upErr.message);
          if (uploadObjectUrlRef.current) {
            URL.revokeObjectURL(uploadObjectUrlRef.current);
            uploadObjectUrlRef.current = null;
          }
          setUploadObjectUrl(null);
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
          setUploadError(insErr.message);
          if (uploadObjectUrlRef.current) {
            URL.revokeObjectURL(uploadObjectUrlRef.current);
            uploadObjectUrlRef.current = null;
          }
          setUploadObjectUrl(null);
          return;
        }

        onChange({
          ...value,
          imageAssetId: assetId,
          imageUrl: "",
        });
        onAssetsUpdated({
          id: assetId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || null,
          bytes: file.size,
        });
      } catch {
        if (uploadObjectUrlRef.current) {
          URL.revokeObjectURL(uploadObjectUrlRef.current);
          uploadObjectUrlRef.current = null;
        }
        setUploadObjectUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [courseId, onChange, onAssetsUpdated, value],
  );

  return (
    <div className="space-y-4">
      <CourseImageLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        assets={imageLibraryAssets}
        selectedId={value.imageAssetId ?? null}
        onPick={(id) => {
          onChange({ ...value, imageAssetId: id, imageUrl: "" });
          setLibraryOpen(false);
        }}
      />

      <div>
        <p className={labelClass()}>Image</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Upload applies to this page immediately. You can also choose an image
          already stored in this course, or paste an external URL below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
        </label>
        {value.imageAssetId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() =>
              onChange({
                ...value,
                imageAssetId: null,
              })
            }
          >
            Remove image
          </button>
        ) : null}
        {imageLibraryAssets.length > 0 ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => setLibraryOpen(true)}
          >
            Pick from course library…
          </button>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}

      <div>
        <label className={labelClass()} htmlFor={`${idPrefix}-url`}>
          External image URL (optional)
        </label>
        <input
          id={`${idPrefix}-url`}
          type="url"
          className={fieldClass()}
          value={value.imageUrl}
          onChange={(e) =>
            onChange({
              ...value,
              imageUrl: e.target.value,
              imageAssetId: e.target.value.trim()
                ? null
                : value.imageAssetId,
            })
          }
          placeholder="https://"
        />
      </div>

      <div>
        <label className={labelClass()} htmlFor={`${idPrefix}-alt`}>
          Alt text
        </label>
        <input
          id={`${idPrefix}-alt`}
          type="text"
          className={fieldClass()}
          value={value.imageAlt}
          onChange={(e) =>
            onChange({ ...value, imageAlt: e.target.value })
          }
          placeholder="Describe the image for accessibility"
        />
      </div>

      {displaySrc ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className={labelClass()}>Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={value.imageAlt || ""}
            className="mt-2 max-h-64 w-full object-contain"
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No image selected yet.</p>
      )}
    </div>
  );
}

type LibraryModalProps = {
  open: boolean;
  onClose: () => void;
  assets: CourseAssetLite[];
  selectedId: string | null;
  onPick: (assetId: string) => void;
};

function CourseImageLibraryModal({
  open,
  onClose,
  assets,
  selectedId,
  onPick,
}: LibraryModalProps) {
  const assetKey = open ? assets.map((asset) => asset.id).join(",") : "";
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const loading = open && loadedFor !== assetKey;

  useEffect(() => {
    if (!open || !assetKey) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const entries = await Promise.all(
        assets.map(async (a) => {
          const { data } = await supabase.storage
            .from(a.bucket)
            .createSignedUrl(a.storage_path, 3600);
          return [a.id, data?.signedUrl ?? ""] as const;
        }),
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [id, url] of entries) {
        if (url) next[id] = url;
      }
      setThumbs(next);
      setLoadedFor(assetKey);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assetKey, assets]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close image library"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-image-lib-title"
        className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2
              id="cbl-image-lib-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Course image library
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Tap a thumbnail to use that image on this page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {assets.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No images in this course yet. Upload an image on any page (or
              here) to build your library.
            </p>
          ) : loading ? (
            <p className="text-sm text-zinc-500">Loading thumbnails…</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {assets.map((a) => {
                const src = thumbs[a.id];
                const isSel = selectedId === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onPick(a.id)}
                      className={`w-full overflow-hidden rounded-xl border text-left transition-shadow ${
                        isSel
                          ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                      }`}
                    >
                      <div className="aspect-square bg-zinc-100 dark:bg-zinc-900">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
                            Preview unavailable
                          </div>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {a.filename}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function TextImageMedia({
  courseId,
  content,
  onChange,
  courseAssets,
  onAssetsUpdated,
}: Props) {
  return (
    <TextImageImagePanel
      courseId={courseId}
      value={{
        imageAssetId: content.imageAssetId,
        imageUrl: content.imageUrl,
        imageAlt: content.imageAlt,
      }}
      onChange={(v) => onChange({ ...content, ...v })}
      courseAssets={courseAssets}
      onAssetsUpdated={onAssetsUpdated}
    />
  );
}

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
}

function labelClass() {
  return "text-xs font-medium text-zinc-600 dark:text-zinc-400";
}
