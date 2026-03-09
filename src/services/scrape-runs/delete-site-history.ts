import { deleteScrapesByUrl } from "@/persistence/scrapes-repository";
import { normalizeUrl } from "./utils";

export async function deleteSiteHistory(input: {
  userId: number;
  rawUrl: string;
}): Promise<void> {
  const url = normalizeUrl(input.rawUrl);
  if (!url) {
    throw new Error("Missing url");
  }

  await deleteScrapesByUrl(input.userId, url);
}
