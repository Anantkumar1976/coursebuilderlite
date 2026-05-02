/** localStorage key for in-browser resume position (preview only). */
export function playProgressStorageKey(courseId: string): string {
  return `cbl-play-progress-${courseId}`;
}

export type PlayProgressV2 = {
  pageIndex: number;
  visitedPageIds: string[];
};

function readRawProgress(courseId: string): string | null {
  if (typeof window === "undefined") return null;
  const key = playProgressStorageKey(courseId);
  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return fromLocal;
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Resume index for launch links (no page-id validation). */
export function readStoredPageIndex(courseId: string): number {
  try {
    const raw = readRawProgress(courseId);
    if (!raw) return 0;
    const o = JSON.parse(raw) as { pageIndex?: number };
    return typeof o.pageIndex === "number" && o.pageIndex >= 0
      ? Math.floor(o.pageIndex)
      : 0;
  } catch {
    return 0;
  }
}

/** Client-only: read and normalize progress against the current flat page order. */
export function readPlayProgress(
  courseId: string,
  flatPageIds: string[],
): PlayProgressV2 {
  if (flatPageIds.length === 0) {
    return { pageIndex: 0, visitedPageIds: [] };
  }
  try {
    const raw = readRawProgress(courseId);
    if (!raw) return { pageIndex: 0, visitedPageIds: [] };
    const o = JSON.parse(raw) as {
      pageIndex?: number;
      visitedPageIds?: string[];
    };
    const maxIdx = flatPageIds.length - 1;
    let pageIndex =
      typeof o.pageIndex === "number"
        ? Math.max(0, Math.min(Math.round(o.pageIndex), maxIdx))
        : 0;

    let visited = Array.isArray(o.visitedPageIds)
      ? o.visitedPageIds.filter((x): x is string => typeof x === "string")
      : [];

    if (visited.length === 0 && typeof o.pageIndex === "number") {
      const idx = Math.max(0, Math.min(Math.round(o.pageIndex), maxIdx));
      visited = flatPageIds.slice(0, idx + 1);
      pageIndex = idx;
    }

    const idSet = new Set(flatPageIds);
    visited = visited.filter((id) => idSet.has(id));

    return { pageIndex, visitedPageIds: visited };
  } catch {
    return { pageIndex: 0, visitedPageIds: [] };
  }
}

export function writePlayProgress(
  courseId: string,
  progress: PlayProgressV2,
): void {
  if (typeof window === "undefined") return;
  const key = playProgressStorageKey(courseId);
  const json = JSON.stringify(progress);
  try {
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch {
    try {
      sessionStorage.setItem(key, json);
    } catch {
      /* ignore */
    }
  }
}
