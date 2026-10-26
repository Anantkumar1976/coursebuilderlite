import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NavigationFlow } from "@/lib/course-player/navigation-flow";

import type { ExportFormat } from "./build-package";

export interface PlayerConfig {
  passingScore: number;
  /** Max submitted assessment scores; null = unlimited. */
  assessmentAttemptsLimit: number | null;
  navigationFlow: NavigationFlow;
}

/** Literal paths so output file tracing bundles them with the export route. */
function readRuntime(format: ExportFormat): { adapter: string; player: string } {
  const runtimeDir = join(process.cwd(), "lib/scorm/runtime");
  return {
    adapter:
      format === "scorm2004"
        ? readFileSync(join(runtimeDir, "lms-scorm2004.js"), "utf8")
        : readFileSync(join(runtimeDir, "lms-scorm12.js"), "utf8"),
    player: readFileSync(join(runtimeDir, "player.js"), "utf8"),
  };
}

/** Builds the single `scormdriver.js` shipped in the package: config + LMS adapter + player. */
export function buildScormDriver(
  format: ExportFormat,
  settings: PlayerConfig,
): string {
  const config: PlayerConfig = {
    passingScore: Math.min(100, Math.max(0, Math.floor(settings.passingScore))),
    assessmentAttemptsLimit:
      settings.assessmentAttemptsLimit === null
        ? null
        : Math.min(1000, Math.max(1, Math.floor(settings.assessmentAttemptsLimit))),
    navigationFlow: settings.navigationFlow,
  };
  const { adapter, player } = readRuntime(format);
  return `window.CBL_CONFIG = ${JSON.stringify(config)};\n${adapter}\n${player}`;
}
