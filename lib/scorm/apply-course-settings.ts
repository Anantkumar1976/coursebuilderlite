import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Injects course mastery threshold and optional assessment attempt cap into
 * packaged scormdriver.js (source keeps defaults for local editing).
 */
export function buildScormDriverWithCourseSettings(
  passingScorePercent: number,
  assessmentAttemptsLimit: number | null,
): string {
  const raw = readFileSync(join(process.cwd(), "lib/scorm/scormdriver.js"), "utf8");
  return applyCourseSettings(raw, passingScorePercent, assessmentAttemptsLimit);
}

export function buildScorm2004DriverWithCourseSettings(
  passingScorePercent: number,
  assessmentAttemptsLimit: number | null,
): string {
  const raw = readFileSync(
    join(process.cwd(), "lib/scorm/scormdriver-2004.js"),
    "utf8",
  );
  return applyCourseSettings(raw, passingScorePercent, assessmentAttemptsLimit);
}

function applyCourseSettings(
  raw: string,
  passingScorePercent: number,
  assessmentAttemptsLimit: number | null,
): string {
  const clamped = Math.min(100, Math.max(0, Math.floor(passingScorePercent)));
  let driver = raw.replace(
    /var PASSING_SCORE = \d+;/,
    `var PASSING_SCORE = ${clamped};`,
  );
  const limitLit =
    assessmentAttemptsLimit === null
      ? "null"
      : String(
          Math.min(1000, Math.max(1, Math.floor(assessmentAttemptsLimit))),
        );
  driver = driver.replace(
    /var ASSESSMENT_ATTEMPTS_LIMIT = null;/,
    `var ASSESSMENT_ATTEMPTS_LIMIT = ${limitLit};`,
  );
  return driver;
}
