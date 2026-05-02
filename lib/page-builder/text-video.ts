import type { TextVideoLayout } from "./types";
import { TEXT_VIDEO_LAYOUTS } from "./types";

export type { TextVideoLayout } from "./types";
export { TEXT_VIDEO_LAYOUTS } from "./types";

/** Human-readable labels for the layout picker. */
export const TEXT_VIDEO_LAYOUT_LABELS: Record<TextVideoLayout, string> = {
  text_top: "Text top + video bottom",
  video_top: "Video top + text bottom",
  video_left: "Video left + text right",
  video_right: "Text left + video right",
  video_only: "Video only",
};

export const DEFAULT_TEXT_VIDEO_LAYOUT: TextVideoLayout = "text_top";

export function parseTextVideoLayout(raw: unknown): TextVideoLayout {
  if (typeof raw !== "string") {
    return DEFAULT_TEXT_VIDEO_LAYOUT;
  }
  if ((TEXT_VIDEO_LAYOUTS as readonly string[]).includes(raw)) {
    return raw as TextVideoLayout;
  }
  return DEFAULT_TEXT_VIDEO_LAYOUT;
}
