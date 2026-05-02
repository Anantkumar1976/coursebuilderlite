import * as Sentry from "@sentry/nextjs";

export function reportScormExportFailure(
  error: unknown,
  context: { courseId: string; format?: string },
) {
  Sentry.captureException(error, {
    tags: { feature: "scorm-export" },
    extra: context,
  });
}
