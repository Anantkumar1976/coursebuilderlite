export function getSafeInternalPath(next: string | null | undefined, fallback = "/courses") {
  if (!next || typeof next !== "string") return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next.trim());
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  return decoded;
}
