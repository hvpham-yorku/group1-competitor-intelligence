import {
  buildObservationRecord,
  buildSourceProductRecord,
  buildSourceVariantRecord,
} from "@/services/scrape-runs/mappers";
import {
  createScrapeRun,
  findLatestStoreScrape,
  findOrCreateStore,
  insertObservation,
  linkUserToScrapeRun,
  runInTransaction,
  upsertSourceProduct,
  upsertSourceVariant,
} from "@/persistence/scrapes-repository";
import type { NormalizedProduct } from "@/services/scraper/normalized-types";
import { getVariants, inferPlatform, normalizeStoreDomain, normalizeUrl } from "./utils";

function getProductKey(product: NormalizedProduct): string {
  const productUrl =
    typeof product.product_url === "string" ? normalizeUrl(product.product_url) : "";
  if (productUrl) {
    return productUrl;
  }

  if (product.id != null) {
    return `id:${String(product.id)}`;
  }

  if (typeof product.handle === "string" && product.handle.trim()) {
    return `handle:${product.handle.trim().toLowerCase()}`;
  }

  return `title:${product.title.trim().toLowerCase()}`;
}

function mergeStoreProducts(
  existingProducts: NormalizedProduct[],
  incomingProducts: NormalizedProduct[]
): NormalizedProduct[] {
  const merged = new Map<string, NormalizedProduct>();

  for (const product of existingProducts) {
    merged.set(getProductKey(product), product);
  }

  for (const product of incomingProducts) {
    merged.set(getProductKey(product), product);
  }

  return Array.from(merged.values());
}

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
        (value): value is number => Number.isInteger(value) && value > 0
      )
    )
  );

  if (userIds.length === 0) {
    throw new Error("Missing user id");
  }

  const products =
    input.resourceType === "product"
      ? mergeStoreProducts(
          (await findLatestStoreScrape(storeDomain))?.products || [],
          incomingProducts
        )
      : incomingProducts;

  let persistedProducts = 0;
  let persistedVariants = 0;
  let scrapeRunId = 0;
  let storeId = 0;

  await runInTransaction(async () => {
    storeId = await findOrCreateStore(storeDomain, inferPlatform(products));
    scrapeRunId = await createScrapeRun(storeId);

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
    products_in_payload: incomingProducts.length,
    persisted_snapshot_products: products.length,
    persisted_products: persistedProducts,
    persisted_variants: persistedVariants,
    duration_ms: Date.now() - startedAt,
  });

  return {
    scrapeRunId,
    storeId,
  };
}
