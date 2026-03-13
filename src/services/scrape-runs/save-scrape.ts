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
  runInTransaction,
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
  const startedAt = Date.now();
  const url = normalizeUrl(input.rawUrl);
  if (!url) {
    throw new Error("Missing url");
  }

  const products = input.products as NormalizedProduct[];
  let persistedProducts = 0;
  let persistedVariants = 0;

  await runInTransaction(async () => {
    const storeId = await findOrCreateStore(url, inferPlatform(products));
    const scrapeRunId = await createScrapeRun();

    await linkUserToScrapeRun(input.userId, scrapeRunId, storeId);

    for (const product of products) {
      if (!product || typeof product.product_url !== "string" || !product.title) {
        continue;
      }

      persistedProducts++;
      const sourceProductId = await upsertSourceProduct(
        storeId,
        buildSourceProductRecord(product)
      );

      for (const [index, variant] of getVariants(product).entries()) {
        persistedVariants++;
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
  });

  console.log("[saveScrapeRun]", {
    url,
    products_in_payload: products.length,
    persisted_products: persistedProducts,
    persisted_variants: persistedVariants,
    duration_ms: Date.now() - startedAt,
  });
}
