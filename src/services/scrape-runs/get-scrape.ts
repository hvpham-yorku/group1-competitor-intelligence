import {
  findPreviousScrapeRun,
  findScrapeRunById,
} from "@/persistence/scrapes-repository";

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
    input.scrapeId,
    scrapeRecord.resource_type
  );

  return {
    id: scrapeRecord.id,
    url: scrapeRecord.url,
    created_at: scrapeRecord.created_at,
    products: scrapeRecord.products,
    previousProducts: previousRun ? previousRun.products : null,
  };
}
