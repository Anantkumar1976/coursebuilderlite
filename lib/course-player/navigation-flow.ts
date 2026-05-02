export const NAVIGATION_FLOWS = ["linear", "open", "website"] as const;

export type NavigationFlow = (typeof NAVIGATION_FLOWS)[number];

export const NAVIGATION_FLOW_LABELS: Record<NavigationFlow, string> = {
  linear: "Linear",
  open: "Open",
  website: "Website (single scroll)",
};

export const NAVIGATION_FLOW_DESCRIPTIONS: Record<NavigationFlow, string> = {
  linear:
    "Learners move in order. The menu only allows the next page and revisiting earlier pages once reached.",
  open:
    "Learners can open any page from the menu. The course is complete when every page has been visited; if the course includes a final assessment, completion also requires passing that test (per passing score).",
  website:
    "All pages appear as one continuous scrolling page (like a website). No Continue button; use the outline to jump to sections.",
};

export function parseNavigationFlow(raw: unknown): NavigationFlow {
  if (raw === "linear" || raw === "open" || raw === "website") {
    return raw;
  }
  return "open";
}

/** Linear mode: can open flat index `i` iff all pages before the first unvisited slot, or that slot itself. */
export function canNavigateToIndexLinear(
  flatPageIds: string[],
  visitedPageIds: Set<string>,
  targetIndex: number,
): boolean {
  if (targetIndex < 0 || targetIndex >= flatPageIds.length) return false;
  const firstUnvisited = flatPageIds.findIndex(
    (id) => !visitedPageIds.has(id),
  );
  if (firstUnvisited === -1) return true;
  return targetIndex <= firstUnvisited;
}
