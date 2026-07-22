"use client";

import { PageAudioMediaPanel } from "@/components/media/page-audio-media";
import { RichTextEditor } from "@/components/rich-text/rich-text-editor";
import type {
  AssetsUpdatedHandler,
  CourseAssetLite,
} from "@/components/media/text-image-media";
import type { QuestionFeedbackFields } from "@/lib/page-builder";

type Props = {
  courseId: string;
  value: QuestionFeedbackFields;
  onChange: (next: QuestionFeedbackFields) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: AssetsUpdatedHandler;
};

function labelClass() {
  return "text-xs font-medium text-zinc-600 dark:text-zinc-400";
}

export function QuestionFeedbackEditor({
  courseId,
  value,
  onChange,
  courseAssets,
  onAssetsUpdated,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <p className={labelClass()}>Knowledge check feedback</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Optional text and audio shown after the learner submits an answer.
          Not used on questions in the final assessment lesson.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Correct answer
        </p>
        <RichTextEditor
          aria-label="Correct answer feedback"
          minHeight="min-h-[100px]"
          value={value.correctFeedback ?? ""}
          onChange={(html) => onChange({ ...value, correctFeedback: html })}
        />
        <PageAudioMediaPanel
          courseId={courseId}
          showTranscript={false}
          description="Optional audio played when the learner submits a correct answer."
          value={{
            pageAudioAssetId: value.correctFeedbackAudioAssetId ?? null,
          }}
          onChange={(v) =>
            onChange({
              ...value,
              correctFeedbackAudioAssetId: v.pageAudioAssetId ?? null,
            })
          }
          courseAssets={courseAssets}
          onAssetsUpdated={onAssetsUpdated}
        />
      </div>

      <div className="space-y-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
          Incorrect answer
        </p>
        <RichTextEditor
          aria-label="Incorrect answer feedback"
          minHeight="min-h-[100px]"
          value={value.incorrectFeedback ?? ""}
          onChange={(html) => onChange({ ...value, incorrectFeedback: html })}
        />
        <PageAudioMediaPanel
          courseId={courseId}
          showTranscript={false}
          description="Optional audio played when the learner submits an incorrect answer."
          value={{
            pageAudioAssetId: value.incorrectFeedbackAudioAssetId ?? null,
          }}
          onChange={(v) =>
            onChange({
              ...value,
              incorrectFeedbackAudioAssetId: v.pageAudioAssetId ?? null,
            })
          }
          courseAssets={courseAssets}
          onAssetsUpdated={onAssetsUpdated}
        />
      </div>
    </div>
  );
}
