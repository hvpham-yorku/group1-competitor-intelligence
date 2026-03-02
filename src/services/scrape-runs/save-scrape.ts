import { insertScrapeRun } from "@/persistence/scrapes-repository";
import { normalizeUrl } from "./utils";

export async function saveScrapeRun(input: {
  userId: number;
  rawUrl: string;
  products: unknown[];
}): Promise<void> {
  const url = normalizeUrl(input.rawUrl);
  if (!url) {
    throw new Error("Missing url");
  }

  await insertScrapeRun({
    userId: input.userId,
    url,
    products: input.products,
  });
}
