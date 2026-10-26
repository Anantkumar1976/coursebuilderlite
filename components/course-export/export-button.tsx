"use client";

import { useState } from "react";

import type { ExportFormat } from "@/lib/scorm/build-package";
import {
  assembleExportZip,
  type ExportPlanResponse,
  type ExportProgress,
} from "@/lib/scorm/export-plan";

type Status =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "working"; progress: ExportProgress }
  | { kind: "error"; message: string };

interface ExportButtonProps {
  courseId: string;
  format: ExportFormat;
  label: string;
  className?: string;
}

export function ExportButton({
  courseId,
  format,
  label,
  className,
}: ExportButtonProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const isBusy = status.kind === "preparing" || status.kind === "working";

  async function handleExport() {
    if (isBusy) return;
    setStatus({ kind: "preparing" });
    try {
      const res = await fetch(`/api/courses/${courseId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const message = (await res.text().catch(() => "")).trim();
        throw new Error(message || `Export failed (${res.status}).`);
      }
      const plan = (await res.json()) as ExportPlanResponse;
      const blob = await assembleExportZip(plan, (progress) =>
        setStatus({ kind: "working", progress }),
      );
      saveBlob(blob, plan.filename);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Export failed. Please try again.",
      });
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={isBusy}
        aria-busy={isBusy}
        className={className}
      >
        {isBusy ? progressLabel(status) : label}
      </button>
      <span aria-live="polite" className="max-w-56 text-xs">
        {status.kind === "error" ? (
          <span className="mt-1 block text-red-600 dark:text-red-400">
            {status.message}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function progressLabel(status: Status): string {
  if (status.kind !== "working") return "Preparing…";
  const { progress } = status;
  if (progress.stage === "media") {
    return progress.total > 0
      ? `Downloading media ${progress.done}/${progress.total}…`
      : "Preparing…";
  }
  return `Zipping ${progress.percent}%…`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
