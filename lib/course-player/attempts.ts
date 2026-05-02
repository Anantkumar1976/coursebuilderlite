/**
 * Client-only attempt tracking for the browser preview player.
 *
 * Semantics:
 *  - An "attempt" begins when a learner starts the course (no active attempt).
 *  - Resuming an active attempt does NOT consume a new one.
 *  - An attempt ends when the learner finishes the course (all pages visited
 *    and, if a final assessment exists, passes it).
 *  - When `used >= limit` and no attempt is active, the course is locked.
 *  - `limit === null` means unlimited attempts (the default).
 */

import { finalQuizResultStorageKey } from "./final-quiz-result";
import { pageAssessmentStorageKey } from "./lesson-assessment";
import { playProgressStorageKey } from "./progress";

export type AttemptsState = {
  used: number;
  active: boolean;
};

export const DEFAULT_ATTEMPTS_STATE: AttemptsState = {
  used: 0,
  active: false,
};

export function attemptsStorageKey(courseId: string): string {
  return `cbl-attempts-${courseId}`;
}

export function readAttemptsState(courseId: string): AttemptsState {
  if (typeof window === "undefined") return { ...DEFAULT_ATTEMPTS_STATE };
  try {
    const raw = localStorage.getItem(attemptsStorageKey(courseId));
    if (!raw) return { ...DEFAULT_ATTEMPTS_STATE };
    const o = JSON.parse(raw) as { used?: unknown; active?: unknown };
    const used =
      typeof o.used === "number" && Number.isFinite(o.used) && o.used >= 0
        ? Math.floor(o.used)
        : 0;
    const active = o.active === true;
    return { used, active };
  } catch {
    return { ...DEFAULT_ATTEMPTS_STATE };
  }
}

function writeAttemptsState(courseId: string, state: AttemptsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      attemptsStorageKey(courseId),
      JSON.stringify({ used: Math.max(0, state.used), active: !!state.active }),
    );
    window.dispatchEvent(new Event("cbl-attempts-updated"));
  } catch {
    /* ignore */
  }
}

/** Parse a DB or form value into a sane limit (null = unlimited). */
export function parseAttemptsLimit(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.floor(raw);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  }
  return null;
}

/** True when all attempts are consumed and none is currently in progress. */
export function isCourseLocked(
  state: AttemptsState,
  limit: number | null,
): boolean {
  if (limit === null) return false;
  return state.used >= limit && !state.active;
}

/** Remaining attempts after the current one, or null for unlimited. */
export function attemptsRemaining(
  state: AttemptsState,
  limit: number | null,
): number | null {
  if (limit === null) return null;
  return Math.max(0, limit - state.used);
}

/** Start a new attempt if one is not already in progress. Returns the next state. */
export function beginAttempt(
  courseId: string,
  limit: number | null,
): { state: AttemptsState; locked: boolean; started: boolean } {
  const cur = readAttemptsState(courseId);
  if (cur.active) {
    return { state: cur, locked: false, started: false };
  }
  if (isCourseLocked(cur, limit)) {
    return { state: cur, locked: true, started: false };
  }
  const next: AttemptsState = { used: cur.used + 1, active: true };
  writeAttemptsState(courseId, next);
  return { state: next, locked: false, started: true };
}

/** Mark the in-progress attempt as finished (does not change `used`). */
export function endAttempt(courseId: string): AttemptsState {
  const cur = readAttemptsState(courseId);
  if (!cur.active) return cur;
  const next: AttemptsState = { used: cur.used, active: false };
  writeAttemptsState(courseId, next);
  return next;
}

/**
 * Clear per-course learner state (progress, page assessments, final quiz
 * result) so a new attempt starts fresh. Does NOT modify the attempts
 * counter itself.
 */
export function clearCourseLearnerState(courseId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(playProgressStorageKey(courseId));
    sessionStorage.removeItem(playProgressStorageKey(courseId));
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(finalQuizResultStorageKey(courseId));
  } catch {
    /* ignore */
  }
  try {
    const prefix = pageAssessmentStorageKey(courseId, "");
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event("cbl-final-quiz-updated"));
    window.dispatchEvent(new Event("cbl-lesson-assess-updated"));
  } catch {
    /* ignore */
  }
}

/** Human-readable label for the launch screen: "3 attempts remaining" etc. */
export function attemptsSummary(
  state: AttemptsState,
  limit: number | null,
): string {
  if (limit === null) return "Unlimited attempts";
  const remaining = attemptsRemaining(state, limit);
  if (remaining === null) return "Unlimited attempts";
  if (remaining === 0 && !state.active) {
    return `No attempts remaining (${state.used} of ${limit} used).`;
  }
  if (state.active) {
    return `Attempt ${state.used} of ${limit} in progress.`;
  }
  const label = remaining === 1 ? "attempt" : "attempts";
  return `${remaining} ${label} remaining (${state.used} of ${limit} used).`;
}
