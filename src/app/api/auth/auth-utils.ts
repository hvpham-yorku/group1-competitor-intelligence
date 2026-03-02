export function getUserIdFromSession(session: unknown): number {
  const sessionRecord =
    session && typeof session === "object"
      ? (session as Record<string, unknown>)
      : {};
  const user =
    sessionRecord.user && typeof sessionRecord.user === "object"
      ? (sessionRecord.user as Record<string, unknown>)
      : {};
  const rawId = user.id;

  if (typeof rawId === "number") {
    return rawId;
  }
  if (typeof rawId === "string") {
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
