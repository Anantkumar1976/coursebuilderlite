import { readFileSync } from "node:fs";
import { join } from "node:path";

import JSZip from "jszip";

import { parsePageContent } from "@/lib/page-builder";
import type { Json } from "@/lib/supabase/database.types";

import { buildScormIndexHtml } from "./build-index-html";
import { buildImsManifest } from "./build-manifest";
import { pageContentToHtml } from "./page-to-html";

export type PageRow = {
  title: string;
  content: Json;
};

export async function buildScormZipBuffer(options: {
  courseTitle: string;
  courseId: string;
  pages: PageRow[];
}): Promise<Buffer> {
  const parsed: { title: string; innerHtml: string }[] = options.pages.map(
    (p) => {
      const content = parsePageContent(p.content);
      return {
        title: p.title || "Untitled page",
        innerHtml: pageContentToHtml(content),
      };
    },
  );

  const indexHtml = buildScormIndexHtml(options.courseTitle, parsed);
  const manifest = buildImsManifest({
    courseTitle: options.courseTitle,
    manifestId: `cbl-${options.courseId}`,
  });

  const driverPath = join(process.cwd(), "lib/scorm/scormdriver.js");
  const driverJs = readFileSync(driverPath, "utf8");

  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifest);
  zip.file("index.html", indexHtml);
  zip.file("scormdriver.js", driverJs);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export function scormZipFilename(courseTitle: string): string {
  const base = courseTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "course"}-scorm12.zip`;
}
