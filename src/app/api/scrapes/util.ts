export function normalizeUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

//Generic used for compile time error checking.
export function safeJsonParse<E>(s: string, backup: E): E {
  try {
    return JSON.parse(s) as E;
  } catch {
    return backup;
  }
}