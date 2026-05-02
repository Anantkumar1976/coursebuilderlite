/**
 * LMS-oriented course score (SCORM export / runtime). Updated only when the
 * learner completes **all** question pages in the **last lesson** and views
 * the Quiz results page there. Earlier lessons use `lesson-assessment` keys only.
 */
export function finalQuizResultStorageKey(courseId: string): string {
  return `cbl-final-quiz-result-${courseId}`;
}

export type FinalQuizResult = {
  passed: boolean;
  /** 0–100 */
  scorePercent: number;
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function readFinalQuizResult(courseId: string): FinalQuizResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(finalQuizResultStorageKey(courseId));
    if (!raw) return null;
    const o = JSON.parse(raw) as {
      passed?: unknown;
      scorePercent?: unknown;
    };
    if (typeof o.passed !== "boolean") return null;
    const scorePercent =
      typeof o.scorePercent === "number" && Number.isFinite(o.scorePercent)
        ? clampScore(o.scorePercent)
        : o.passed
          ? 100
          : 0;
    return { passed: o.passed, scorePercent };
  } catch {
    /* ignore */
  }
  return null;
}

export function writeFinalQuizResult(
  courseId: string,
  result: FinalQuizResult,
): void {
  try {
    localStorage.setItem(
      finalQuizResultStorageKey(courseId),
      JSON.stringify({
        passed: result.passed,
        scorePercent: clampScore(result.scorePercent),
      }),
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cbl-final-quiz-updated"));
    }
  } catch {
    /* ignore */
  }
}

export function clearFinalQuizResult(courseId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(finalQuizResultStorageKey(courseId));
    window.dispatchEvent(new Event("cbl-final-quiz-updated"));
  } catch {
    /* ignore */
  }
}
