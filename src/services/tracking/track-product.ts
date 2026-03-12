import { insertTrackedProduct } from "@/persistence/tracked-products-repository";
import { normalizeTrackedProductInput } from "./utils";

export async function trackProduct(input: {
  userId: number;
  title?: unknown;
  platform?: unknown;
  product_url?: unknown;
}): Promise<void> {
  const normalized = normalizeTrackedProductInput(input);

  await insertTrackedProduct({
    userId: input.userId,
    title: normalized.title,
    shop: normalized.shop,
    url: normalized.url,
  });
}
