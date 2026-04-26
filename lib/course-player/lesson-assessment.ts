/**
 * Per-page assessment results within a course (MCQ / MRQ / True–False).
 * Aggregated per lesson for the Quiz results page.
 */

export function pageAssessmentStorageKey(
  courseId: string,
  pageId: string,
): string {
  return `cbl-assess-${courseId}-${pageId}`;
}

export type StoredAssessment = {
  correct: boolean;
  mcqPick?: number;
  mrqSelected?: number[];
  tfPick?: boolean;
};

export function readPageAssessment(
  courseId: string,
  pageId: string,
): StoredAssessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(pageAssessmentStorageKey(courseId, pageId));
    if (!raw) return null;
    const o = JSON.parse(raw) as StoredAssessment;
    if (typeof o.correct !== "boolean") return null;
    return o;
  } catch {
    return null;
  }
}

export function writePageAssessment(
  courseId: string,
  pageId: string,
  data: StoredAssessment,
): void {
  try {
    localStorage.setItem(
      pageAssessmentStorageKey(courseId, pageId),
      JSON.stringify(data),
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cbl-lesson-assess-updated"));
    }
  } catch {
    /* ignore */
  }
}

export function clearPageAssessmentsForPageIds(
  courseId: string,
  pageIds: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    for (const id of pageIds) {
      localStorage.removeItem(pageAssessmentStorageKey(courseId, id));
    }
    window.dispatchEvent(new Event("cbl-lesson-assess-updated"));
  } catch {
    /* ignore */
  }
}
