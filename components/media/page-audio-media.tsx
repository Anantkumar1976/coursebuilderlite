"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import { createClient } from "@/lib/supabase/client";

import type { CourseAssetLite, AssetsUpdatedHandler } from "./text-image-media";

export type PageAudioMediaValue = {
  pageAudioAssetId?: string | null;
  pageAudioTranscript?: string;
};

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;

export function isCourseAudioAsset(a: CourseAssetLite): boolean {
  const mime = a.mime_type?.toLowerCase() ?? "";
  if (mime.startsWith("audio/")) return true;
  return AUDIO_EXTENSIONS.test(a.filename);
}

type Props = {
  courseId: string;
  value: PageAudioMediaValue;
  onChange: (next: PageAudioMediaValue) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: AssetsUpdatedHandler;
  showTranscript?: boolean;
  description?: string;
};

export function PageAudioMediaPanel({
  courseId,
  value,
  onChange,
  courseAssets,
  onAssetsUpdated,
  showTranscript = true,
  description = "Optional narration or instruction audio for this page. Upload a file so it is included in SCORM and standalone exports. In the player, audio starts after images and embedded media on the page finish loading.",
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const audioAssets = useMemo(
    () => courseAssets.filter(isCourseAudioAsset),
    [courseAssets],
  );

  useEffect(() => {
    const assetId = value.pageAudioAssetId;
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
  }, [value.pageAudioAssetId]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const lowerName = file.name.toLowerCase();
      const isAudio =
        file.type.toLowerCase().startsWith("audio/") ||
        AUDIO_EXTENSIONS.test(lowerName);
      if (!isAudio) {
        setUploadError("Please choose an audio file (MP3, WAV, OGG, M4A, etc.).");
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
            : `audio-${Date.now()}`;
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
            contentType: file.type || "audio/mpeg",
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
          mime_type: file.type || "audio/mpeg",
          bytes: file.size,
        });
        if (insErr) {
          await supabase.storage.from("assets").remove([storagePath]);
          setUploadError(insErr.message);
          return;
        }
        onChange({ ...value, pageAudioAssetId: assetId });
        onAssetsUpdated({
          id: assetId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || "audio/mpeg",
          bytes: file.size,
        });
      } finally {
        setUploading(false);
      }
    },
    [courseId, onAssetsUpdated, onChange, value],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading..." : "Upload audio"}
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
        </label>
        {value.pageAudioAssetId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => onChange({ ...value, pageAudioAssetId: null })}
          >
            Remove audio
          </button>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}

      {audioAssets.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Or pick audio from this course
          </p>
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
            {audioAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`rounded-md px-2 py-1.5 text-left text-sm ${
                  value.pageAudioAssetId === a.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() => onChange({ ...value, pageAudioAssetId: a.id })}
              >
                {a.filename}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Preview
          </p>
          <audio controls preload="metadata" src={previewUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No page audio attached.</p>
      )}

      {showTranscript ? (
      <div>
        <label
          htmlFor="page-audio-transcript"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          Transcript (optional)
        </label>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Plain text shown when learners tap Transcript in the player. Add this
          when your page has narration audio.
        </p>
        <textarea
          id="page-audio-transcript"
          rows={6}
          value={value.pageAudioTranscript ?? ""}
          onChange={(e) =>
            onChange({ ...value, pageAudioTranscript: e.target.value })
          }
          placeholder="Enter the spoken narration or instruction text…"
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
        />
      </div>
      ) : null}
    </div>
  );
}
