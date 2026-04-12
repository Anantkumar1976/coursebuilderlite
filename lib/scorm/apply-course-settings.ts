import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Replace mastery threshold in packaged scormdriver.js (source file keeps default 70 for dev). */
export function buildScormDriverWithPassingScore(passingScorePercent: number): string {
  const raw = readFileSync(
    join(process.cwd(), "lib/scorm/scormdriver.js"),
    "utf8",
  );
  const clamped = Math.min(100, Math.max(0, Math.floor(passingScorePercent)));
  return raw.replace(
    /var PASSING_SCORE = \d+;/,
    `var PASSING_SCORE = ${clamped};`,
  );
}
