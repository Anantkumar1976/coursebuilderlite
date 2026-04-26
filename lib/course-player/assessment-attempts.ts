/**
 * Tracks how many times the learner has completed the final assessment
 * (all lesson questions answered + results recorded). Separate from course
 * launch attempts (`attempts.ts`).
 */

import { readPageAssessment } from "./lesson-assessment";

export function assessmentAttemptsUsedKey(courseId: string): string {
  return `cbl-assessment-attempts-used-${courseId}`;
}

export function assessmentAttemptEpochKey(courseId: string): string {
  return `cbl-assessment-attempt-epoch-${courseId}`;
}

function lastCommitKey(courseId: string): string {
  return `cbl-assessment-last-commit-${courseId}`;
}

export function readAssessmentAttemptsUsed(courseId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(assessmentAttemptsUsedKey(courseId));
    if (!raw) return 0;
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeUsed(courseId: string, n: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(assessmentAttemptsUsedKey(courseId), String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

function incrementUsed(courseId: string): void {
  writeUsed(courseId, readAssessmentAttemptsUsed(courseId) + 1);
}

export function readAssessmentAttemptEpoch(courseId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(assessmentAttemptEpochKey(courseId));
    if (!raw) return 0;
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpAssessmentAttemptEpoch(courseId: string): number {
  const next = readAssessmentAttemptEpoch(courseId) + 1;
  if (typeof window === "undefined") return next;
  try {
    localStorage.setItem(assessmentAttemptEpochKey(courseId), String(next));
    localStorage.removeItem(lastCommitKey(courseId));
  } catch {
    /* ignore */
  }
  return next;
}

function answersSignature(
  courseId: string,
  pageIds: string[],
): string {
  return pageIds
    .map((id) => {
      const r = readPageAssessment(courseId, id);
      if (!r) return `${id}:`;
      return `${id}:${r.correct ? "1" : "0"}`;
    })
    .join("|");
}

/**
 * Idempotent: counts one submission per distinct completion (epoch + answers).
 * Survives React StrictMode double effects.
 */
export function tryCommitAssessmentCompletion(
  courseId: string,
  pageIds: string[],
): { committed: boolean } {
  if (typeof window === "undefined") return { committed: false };
  const epoch = readAssessmentAttemptEpoch(courseId);
  const sig = answersSignature(courseId, pageIds);
  const key = `${epoch}:${sig}`;
  try {
    const prev = localStorage.getItem(lastCommitKey(courseId));
    if (prev === key) return { committed: false };
    localStorage.setItem(lastCommitKey(courseId), key);
    incrementUsed(courseId);
    return { committed: true };
  } catch {
    return { committed: false };
  }
}

export function isFinalAssessmentLocked(
  courseId: string,
  limit: number | null,
): boolean {
  if (limit === null) return false;
  return readAssessmentAttemptsUsed(courseId) >= limit;
}

export function canRetakeAssessment(
  courseId: string,
  limit: number | null,
): boolean {
  if (limit === null) return true;
  return readAssessmentAttemptsUsed(courseId) < limit;
}
