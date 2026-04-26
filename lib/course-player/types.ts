import type { PageContentV1 } from "@/lib/page-builder";

export type PlayerPage = {
  id: string;
  title: string;
  /** Lesson this page belongs to (for lesson-scoped quiz scoring). */
  lessonId: string;
  content: PageContentV1;
};

export type LessonNav = {
  id: string;
  title: string;
  pages: PlayerPage[];
};
