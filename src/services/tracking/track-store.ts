import {
  findStoreIdByUrl,
  upsertTrackedStore,
  userHasTrackedStoreScrape,
} from "@/persistence/tracked-stores-repository";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import { normalizeTrackedStoreInput } from "@/services/tracking/utils";

export async function trackStore(input: {
  userId: number;
  store_url?: unknown;
  is_owned_store?: boolean;
}): Promise<void> {
  const normalized = normalizeTrackedStoreInput(input);
  let storeId = await findStoreIdByUrl(normalized.url);
  let needsInitialScrape = !storeId;

  if (storeId) {
    needsInitialScrape = !(await userHasTrackedStoreScrape({
      userId: input.userId,
      storeId,
    }));
  }

  if (needsInitialScrape) {
    const engine = ScraperEngine.getInstance();
    const request = new ScraperRequest(normalized.url);
    request.resourceType = "store";

    const result = await engine.execute(request);
    const savedRun = await saveScrapeRun({
      userId: input.userId,
      rawUrl: normalized.url,
      products: Array.isArray(result?.products) ? result.products : [],
      resourceType: "store",
    });

    storeId = savedRun.storeId;
  }

  if (!storeId) {
    throw new Error("Tracked store was not found in stores");
  }

  await upsertTrackedStore({
    userId: input.userId,
    storeId,
    isOwnedStore: input.is_owned_store === true,
  });
}
