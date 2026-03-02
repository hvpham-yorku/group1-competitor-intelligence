import {
  findPreviousScrapeRun,
  findScrapeRunById,
} from "@/persistence/scrapes-repository";
import { safeJsonParse } from "./utils";

export type GetScrapeRunResult = {
  id: number;
  url: string;
  created_at: string;
  products: unknown[];
  previousProducts: unknown[] | null;
};

export async function getScrapeRun(input: {
  userId: number;
  scrapeId: number;
}): Promise<GetScrapeRunResult | null> {
  const scrapeRecord = await findScrapeRunById(input.userId, input.scrapeId);
  if (!scrapeRecord) {
    return null;
  }

  const previousRun = await findPreviousScrapeRun(
    input.userId,
    scrapeRecord.url,
    input.scrapeId
  );

  return {
    id: scrapeRecord.id,
    url: scrapeRecord.url,
    created_at: scrapeRecord.created_at,
    products: safeJsonParse<unknown[]>(scrapeRecord.products_json || "[]", []),
    previousProducts: previousRun
      ? safeJsonParse<unknown[]>(previousRun.products_json || "[]", [])
      : null,
  };
}
