import type { Json } from "@/lib/supabase/database.types";

export interface ThemeFonts {
  courseTitle: string;
  pageTitle: string;
  pageContent: string;
  /** CSS font-size (`px` recommended; `rem`/`em` still accepted when saved). */
  courseTitleSize: string;
  pageTitleSize: string;
  pageContentSize: string;
}

export interface ThemeColors {
  button: string;
  highlight: string;
}

export const DEFAULT_THEME_FONTS: ThemeFonts = {
  courseTitle:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  pageTitle:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  pageContent:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  courseTitleSize: "12px",
  pageTitleSize: "30px",
  pageContentSize: "16px",
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  button: "#18181b",
  highlight: "#27272a",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Loose validation for CSS font-size values (rem, px, em). */
function isFontSizeToken(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^\d+(\.\d+)?(rem|px|em)$/i.test(t);
}

/** Assumed root font size when converting rem/em → px (browser default). */
const ROOT_FONT_PX = 16;

/**
 * Normalize font-size tokens to `px` for display and API consistency.
 * Existing rows may still store `rem` from earlier defaults; we convert on read.
 */
function fontSizeToPxDisplay(raw: string): string {
  const t = raw.trim();
  const rem = t.match(/^(\d+(?:\.\d+)?)rem$/i);
  if (rem) {
    const px = parseFloat(rem[1]) * ROOT_FONT_PX;
    return `${Math.round(px)}px`;
  }
  const em = t.match(/^(\d+(?:\.\d+)?)em$/i);
  if (em) {
    const px = parseFloat(em[1]) * ROOT_FONT_PX;
    return `${Math.round(px)}px`;
  }
  return t;
}

export function parseThemeFonts(json: Json | undefined): ThemeFonts {
  if (!isRecord(json)) return { ...DEFAULT_THEME_FONTS };
  const ct =
    typeof json.courseTitle === "string" && json.courseTitle.trim()
      ? json.courseTitle
      : DEFAULT_THEME_FONTS.courseTitle;
  const pt =
    typeof json.pageTitle === "string" && json.pageTitle.trim()
      ? json.pageTitle
      : DEFAULT_THEME_FONTS.pageTitle;
  const pc =
    typeof json.pageContent === "string" && json.pageContent.trim()
      ? json.pageContent
      : DEFAULT_THEME_FONTS.pageContent;

  const ctsRaw =
    typeof json.courseTitleSize === "string" ? json.courseTitleSize.trim() : "";
  const ptsRaw =
    typeof json.pageTitleSize === "string" ? json.pageTitleSize.trim() : "";
  const pcsRaw =
    typeof json.pageContentSize === "string"
      ? json.pageContentSize.trim()
      : "";

  return {
    courseTitle: ct,
    pageTitle: pt,
    pageContent: pc,
    courseTitleSize: isFontSizeToken(ctsRaw)
      ? fontSizeToPxDisplay(ctsRaw)
      : DEFAULT_THEME_FONTS.courseTitleSize,
    pageTitleSize: isFontSizeToken(ptsRaw)
      ? fontSizeToPxDisplay(ptsRaw)
      : DEFAULT_THEME_FONTS.pageTitleSize,
    pageContentSize: isFontSizeToken(pcsRaw)
      ? fontSizeToPxDisplay(pcsRaw)
      : DEFAULT_THEME_FONTS.pageContentSize,
  };
}

function isHexColor(s: string): boolean {
  const t = s.trim();
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(t);
}

export function parseThemeColors(json: Json | undefined): ThemeColors {
  if (!isRecord(json)) return { ...DEFAULT_THEME_COLORS };
  const btnRaw = typeof json.button === "string" ? json.button.trim() : "";
  const hiRaw = typeof json.highlight === "string" ? json.highlight.trim() : "";
  const btn = btnRaw && isHexColor(btnRaw) ? btnRaw : DEFAULT_THEME_COLORS.button;
  const hi =
    hiRaw && isHexColor(hiRaw) ? hiRaw : DEFAULT_THEME_COLORS.highlight;
  return { button: btn, highlight: hi };
}

export function themeFontsToJson(f: ThemeFonts): Json {
  return {
    courseTitle: f.courseTitle,
    pageTitle: f.pageTitle,
    pageContent: f.pageContent,
    courseTitleSize: f.courseTitleSize,
    pageTitleSize: f.pageTitleSize,
    pageContentSize: f.pageContentSize,
  };
}

export function themeColorsToJson(c: ThemeColors): Json {
  return { button: c.button, highlight: c.highlight };
}
