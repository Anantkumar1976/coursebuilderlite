/** Max length for company / workgroup display names. */
export const WORKSPACE_NAME_MAX_LENGTH = 80;

const STORAGE_KEY = "cbl_signup_workspace_name";

export function normalizeWorkspaceName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, WORKSPACE_NAME_MAX_LENGTH);
}

export function parseWorkspaceName(raw: unknown): string | null {
  const name = normalizeWorkspaceName(raw);
  return name.length >= 2 ? name : null;
}

export function workspaceNameValidationError(raw: unknown): string | null {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return "Enter a company or workgroup name.";
  if (trimmed.length < 2) return "Use at least 2 characters for the company/workgroup name.";
  return null;
}

/** Persist workspace name across the PayPal redirect (browser only). */
export function storeSignupWorkspaceName(name: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, normalizeWorkspaceName(name));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSignupWorkspaceName(): string {
  if (typeof window === "undefined") return "";
  try {
    return normalizeWorkspaceName(sessionStorage.getItem(STORAGE_KEY) ?? "");
  } catch {
    return "";
  }
}

export function clearSignupWorkspaceName() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
