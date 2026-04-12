function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeXmlComment(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/--/g, "- -")
    .slice(0, 2000);
}

function isoDurationFromMinutes(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m === 0) return "PT0M";
  return `PT${m}M`;
}

/** Minimal SCORM 1.2 imsmanifest.xml (single SCO). */
export function buildImsManifest(options: {
  courseTitle: string;
  manifestId: string;
  /** Additional packaged files (e.g. media/uuid.png) so the manifest lists the full payload. */
  packageFiles?: string[];
  /** BCP 47 tag on the manifest root (e.g. en, en-US). */
  locale?: string;
  /** Optional LMS-oriented summary (falls back to course description at export time if omitted). */
  manifestSummary?: string | null;
  estimatedDurationMinutes?: number | null;
}): string {
  const title = escapeXml(options.courseTitle);
  const mid = escapeXml(options.manifestId.replace(/[^a-zA-Z0-9_-]/g, "-"));
  const extraFiles = options.packageFiles ?? [];
  const extraXml = extraFiles
    .map((href) => `      <file href="${escapeXml(href)}"/>`)
    .join("\n");

  const lang = (options.locale ?? "en").trim() || "en";
  const langAttr = escapeXml(lang);
  const summary = (options.manifestSummary ?? "").trim();
  const summaryComment =
    summary.length > 0
      ? `\n  <!-- ${safeXmlComment(summary)} -->`
      : "";
  const dur = options.estimatedDurationMinutes;
  const durComment =
    typeof dur === "number" && dur >= 0
      ? `\n  <!-- typicalLearningTime ${isoDurationFromMinutes(dur)} -->`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>${summaryComment}${durComment}
<manifest identifier="${mid}" version="1.0" xml:lang="${langAttr}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>${title}</title>
      <item identifier="ITEM1" identifierref="RES1" isvisible="true">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scormdriver.js"/>
${extraXml ? `${extraXml}\n` : ""}    </resource>
  </resources>
</manifest>
`;

}
