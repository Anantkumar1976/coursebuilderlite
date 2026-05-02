import type { LessonNav } from "@/lib/course-player/types";

/** True if any page uses the quiz results template (final lesson rollup). */
export function courseHasQuizResultsPage(lessons: LessonNav[]): boolean {
  for (const lesson of lessons) {
    for (const page of lesson.pages) {
      if (page.content.template === "quiz_results") return true;
    }
  }
  return false;
}

export function allPagesVisited(
  flatPageIds: string[],
  visitedPageIds: Set<string>,
): boolean {
  if (flatPageIds.length === 0) return true;
  return flatPageIds.every((id) => visitedPageIds.has(id));
}

export function isCourseCompletionTemplate(
  page: LessonNav["pages"][number] | undefined,
): boolean {
  return page?.content.template === "course_completion";
}
