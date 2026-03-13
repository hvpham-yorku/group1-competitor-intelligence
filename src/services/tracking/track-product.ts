import {
  findSourceProductIdByUrl,
  insertTrackedProduct,
} from "@/persistence/tracked-products-repository";
import { normalizeTrackedProductInput } from "./utils";

export async function trackProduct(input: {
  userId: number;
  product_url?: unknown;
}): Promise<void> {
  const normalized = normalizeTrackedProductInput(input);
  const sourceProductId = await findSourceProductIdByUrl(normalized.url);

  if (!sourceProductId) {
    throw new Error("Tracked product was not found in source_products");
  }

  await insertTrackedProduct({
    userId: input.userId,
    sourceProductId,
  });
}
