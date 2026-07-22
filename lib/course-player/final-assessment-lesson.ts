/** Lesson that contains a quiz results page (typically the course final exam). */
export function findFinalAssessmentLessonId(
  lessons: {
    id: string;
    sort_order?: number;
    pages: { content: { template: string } }[];
  }[],
): string | null {
  const sorted =
    lessons.some((l) => l.sort_order !== undefined)
      ? [...lessons].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [...lessons];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const lesson = sorted[i];
    if (lesson.pages.some((p) => p.content.template === "quiz_results")) {
      return lesson.id;
    }
  }
  return null;
}

export function lessonIdForPageId(
  lessons: { id: string; pages: { id: string; lessonId?: string }[] }[],
  pageId: string,
): string | null {
  for (const lesson of lessons) {
    for (const page of lesson.pages) {
      if (page.id === pageId) {
        return page.lessonId ?? lesson.id;
      }
    }
  }
  return null;
}

export function isKnowledgeCheckQuestionPage(
  lessons: {
    id: string;
    sort_order?: number;
    pages: {
      id: string;
      lessonId?: string;
      content: { template: string };
    }[];
  }[],
  pageId: string,
): boolean {
  const page = lessons.flatMap((l) => l.pages).find((p) => p.id === pageId);
  if (!page) return false;
  const template = page.content.template;
  if (template !== "mcq" && template !== "mrq" && template !== "true_false") {
    return false;
  }
  const pageLessonId = page.lessonId ?? lessonIdForPageId(lessons, pageId);
  if (!pageLessonId) return false;
  const finalLessonId = findFinalAssessmentLessonId(lessons);
  if (!finalLessonId) return true;
  return pageLessonId !== finalLessonId;
}
