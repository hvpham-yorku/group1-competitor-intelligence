import { deleteScrapeRun as deleteScrapeRunRecord } from "@/persistence/scrapes-repository";

export async function deleteScrapeRun(input: {
  userId: number;
  scrapeId: number;
}): Promise<void> {
  await deleteScrapeRunRecord(input.userId, input.scrapeId);
}
