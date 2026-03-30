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
import { getVariants, inferPlatform, normalizeStoreDomain, normalizeUrl } from "./utils";

export async function saveScrapeRun(input: {
  userId?: number;
  userIds?: number[];
  rawUrl: string;
  products: unknown[];
  resourceType?: "product" | "collection" | "store";
}): Promise<{ scrapeRunId: number; storeId: number }> {
  const startedAt = Date.now();
  const url = normalizeUrl(input.rawUrl);
  const storeDomain = normalizeStoreDomain(input.rawUrl);
  if (!url || !storeDomain) {
    throw new Error("Missing url");
  }

  const incomingProducts = input.products as NormalizedProduct[];
  const userIds = Array.from(
    new Set(
      [input.userId, ...(input.userIds || [])].filter(
        (value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0
      )
    )
  );

  if (userIds.length === 0) {
    throw new Error("Missing user id");
  }

  const products = incomingProducts;
  const resourceType = input.resourceType || "store";

  let persistedProducts = 0;
  let persistedVariants = 0;
  let scrapeRunId = 0;
  let storeId = 0;

  await runInTransaction(async () => {
    storeId = await findOrCreateStore(storeDomain, inferPlatform(products));
    scrapeRunId = await createScrapeRun(storeId, resourceType);

    for (const userId of userIds) {
      await linkUserToScrapeRun(userId, scrapeRunId, storeId);
    }

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
    store_domain: storeDomain,
    resource_type: resourceType,
    products_in_payload: incomingProducts.length,
    persisted_products: persistedProducts,
    persisted_variants: persistedVariants,
    duration_ms: Date.now() - startedAt,
  });

  return {
    scrapeRunId,
    storeId,
  };
}
