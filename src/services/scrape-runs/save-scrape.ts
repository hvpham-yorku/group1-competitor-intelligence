import {
  buildObservationRecord,
  buildSourceProductRecord,
  buildSourceVariantRecord,
} from "@/services/scrape-runs/mappers";
import {
  createScrapeRun,
  findOrCreateStore,
  insertObservation,
  linkUserToScrapeRun,
  upsertSourceProduct,
  upsertSourceVariant,
} from "@/persistence/scrapes-repository";
import type { NormalizedProduct } from "@/services/scraper/normalized-types";
import { getVariants, inferPlatform, normalizeUrl } from "./utils";

export async function saveScrapeRun(input: {
  userId: number;
  rawUrl: string;
  products: unknown[];
}): Promise<void> {
  const url = normalizeUrl(input.rawUrl);
  if (!url) {
    throw new Error("Missing url");
  }

  const products = input.products as NormalizedProduct[];
  const storeId = await findOrCreateStore(url, inferPlatform(products));
  const scrapeRunId = await createScrapeRun(storeId);

  await linkUserToScrapeRun(input.userId, scrapeRunId);

  for (const product of products) {
    if (!product || typeof product.product_url !== "string" || !product.title) {
      continue;
    }

    const sourceProductId = await upsertSourceProduct(
      storeId,
      buildSourceProductRecord(product)
    );

    for (const [index, variant] of getVariants(product).entries()) {
      const sourceVariantId = await upsertSourceVariant(
        sourceProductId,
        buildSourceVariantRecord(product, variant, index)
      );

      await insertObservation({
        scrapeRunId,
        sourceVariantId,
        observation: buildObservationRecord(product, variant),
      });
    }
  }
}
