import type { QuestionFeedbackFields } from "./types";

export function parseQuestionFeedbackFields(
  raw: Record<string, unknown>,
): QuestionFeedbackFields {
  return {
    correctFeedback:
      typeof raw.correctFeedback === "string" ? raw.correctFeedback : "",
    incorrectFeedback:
      typeof raw.incorrectFeedback === "string" ? raw.incorrectFeedback : "",
    correctFeedbackAudioAssetId:
      typeof raw.correctFeedbackAudioAssetId === "string" &&
      raw.correctFeedbackAudioAssetId.length > 0
        ? raw.correctFeedbackAudioAssetId
        : null,
    incorrectFeedbackAudioAssetId:
      typeof raw.incorrectFeedbackAudioAssetId === "string" &&
      raw.incorrectFeedbackAudioAssetId.length > 0
        ? raw.incorrectFeedbackAudioAssetId
        : null,
  };
}

export function attachQuestionFeedback<T extends object>(
  content: T,
  raw: Record<string, unknown>,
): T & QuestionFeedbackFields {
  return { ...content, ...parseQuestionFeedbackFields(raw) };
}

export function emptyQuestionFeedbackFields(): QuestionFeedbackFields {
  return {
    correctFeedback: "",
    incorrectFeedback: "",
    correctFeedbackAudioAssetId: null,
    incorrectFeedbackAudioAssetId: null,
  };
}

export function hasQuestionFeedback(content: QuestionFeedbackFields): boolean {
  return Boolean(
    content.correctFeedback?.trim() ||
      content.incorrectFeedback?.trim() ||
      content.correctFeedbackAudioAssetId ||
      content.incorrectFeedbackAudioAssetId,
  );
}

export function resolveQuestionFeedbackAudioSrc(
  assetId: string | null | undefined,
  signedAssetUrls?: Record<string, string>,
): string | null {
  if (!assetId) return null;
  return signedAssetUrls?.[assetId] ?? null;
}
